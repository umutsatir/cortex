//! Google Calendar (read-only) over OAuth 2.0 for installed apps:
//! loopback redirect + PKCE. The refresh token lives in the Keychain; access tokens
//! are only kept in memory.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use base64::engine::general_purpose::{URL_SAFE, URL_SAFE_NO_PAD};
use base64::Engine;
use chrono::{DateTime, Utc};
use rand::RngCore;
use reqwest::Client;
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::Notify;

use crate::events::{auth_err, CalEvent, EventsResult, AUTH_ERR};
use crate::secrets;

// Desktop OAuth clients cannot keep a secret; Google documents that it is embedded in
// the app. Both values come from the build environment (see build.rs / release.yml).
const CLIENT_ID: Option<&str> = option_env!("GOOGLE_CLIENT_ID");
const CLIENT_SECRET: Option<&str> = option_env!("GOOGLE_CLIENT_SECRET");

const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const REVOKE_URL: &str = "https://oauth2.googleapis.com/revoke";
const API: &str = "https://www.googleapis.com/calendar/v3";
const SCOPES: &str = "openid email https://www.googleapis.com/auth/calendar.readonly";
const LOGIN_TIMEOUT: Duration = Duration::from_secs(180);

#[derive(Default)]
pub struct TokenCache {
    tokens: Mutex<HashMap<String, (String, Instant)>>,
    pending_login: Mutex<Option<Arc<Notify>>>,
}

fn credentials() -> Result<(&'static str, &'static str), String> {
    match (CLIENT_ID, CLIENT_SECRET) {
        (Some(id), Some(secret)) if !id.is_empty() => Ok((id, secret)),
        _ => Err("Google Calendar is not configured in this build".to_string()),
    }
}

fn client() -> Result<Client, String> {
    Client::builder().timeout(Duration::from_secs(30)).build().map_err(|e| e.to_string())
}

fn random_token(bytes: usize) -> String {
    let mut buf = vec![0u8; bytes];
    rand::thread_rng().fill_bytes(&mut buf);
    URL_SAFE_NO_PAD.encode(buf)
}

pub fn account_id(email: &str) -> String {
    format!("google:{}", email.trim().to_lowercase())
}

// ── Loopback redirect ─────────────────────────────────────────────────────────

const DONE_PAGE: &str = r#"<!doctype html><html><head><meta charset="utf-8"><title>Cortex</title>
<style>body{font:15px -apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#333}</style>
</head><body><div style="text-align:center"><h2>Cortex</h2><p>You can close this tab and return to Cortex.<br>Bu sekmeyi kapatıp Cortex'e dönebilirsiniz.</p></div></body></html>"#;

async fn respond(stream: &mut tokio::net::TcpStream, status: &str, body: &str) {
    let resp = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(resp.as_bytes()).await;
    let _ = stream.shutdown().await;
}

/// Waits for Google's redirect to the loopback server and returns the auth code.
async fn wait_for_code(listener: &TcpListener, expected_state: &str) -> Result<String, String> {
    loop {
        let (mut stream, _) = listener.accept().await.map_err(|e| e.to_string())?;
        let mut buf = vec![0u8; 8192];
        let mut len = 0;
        while len < buf.len() {
            let n = stream.read(&mut buf[len..]).await.map_err(|e| e.to_string())?;
            if n == 0 {
                break;
            }
            len += n;
            if buf[..len].windows(4).any(|w| w == b"\r\n\r\n") {
                break;
            }
        }
        let req = String::from_utf8_lossy(&buf[..len]);
        let path = req.lines().next().and_then(|l| l.split_whitespace().nth(1)).unwrap_or("/");
        let Ok(url) = url::Url::parse(&format!("http://127.0.0.1{path}")) else {
            respond(&mut stream, "400 Bad Request", "").await;
            continue;
        };
        let q: HashMap<String, String> = url.query_pairs().into_owned().collect();

        if let Some(err) = q.get("error") {
            respond(&mut stream, "200 OK", DONE_PAGE).await;
            return Err(if err == "access_denied" { "Google sign-in was cancelled".into() } else { format!("Google sign-in failed: {err}") });
        }
        match (q.get("code"), q.get("state")) {
            (Some(code), Some(state)) if state == expected_state => {
                respond(&mut stream, "200 OK", DONE_PAGE).await;
                return Ok(code.clone());
            }
            // favicon requests, stray hits, or a stale tab from an older attempt
            _ => respond(&mut stream, "404 Not Found", "").await,
        }
    }
}

// ── Tokens ────────────────────────────────────────────────────────────────────

async fn token_request(form: &[(&str, &str)]) -> Result<Value, String> {
    let resp = client()?.post(TOKEN_URL).form(form).send().await.map_err(|e| e.to_string())?;
    let status = resp.status();
    let json: Value = resp.json().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        let err = json["error"].as_str().unwrap_or("unknown_error");
        if err == "invalid_grant" {
            return Err(auth_err("Google access was revoked or has expired"));
        }
        return Err(format!("Google token request failed: {err}"));
    }
    Ok(json)
}

fn remember(cache: &TokenCache, account_id: &str, json: &Value) -> Option<String> {
    let token = json["access_token"].as_str()?.to_string();
    let ttl = json["expires_in"].as_u64().unwrap_or(3600);
    cache
        .tokens
        .lock()
        .unwrap()
        .insert(account_id.to_string(), (token.clone(), Instant::now() + Duration::from_secs(ttl)));
    Some(token)
}

async fn access_token(cache: &TokenCache, account_id: &str) -> Result<String, String> {
    if let Some((tok, exp)) = cache.tokens.lock().unwrap().get(account_id) {
        if *exp > Instant::now() + Duration::from_secs(60) {
            return Ok(tok.clone());
        }
    }
    let (id, secret) = credentials()?;
    let refresh = secrets::get(account_id)?.ok_or_else(|| auth_err("No stored Google credentials"))?;
    let json = token_request(&[
        ("client_id", id),
        ("client_secret", secret),
        ("refresh_token", &refresh),
        ("grant_type", "refresh_token"),
    ])
    .await?;
    remember(cache, account_id, &json).ok_or_else(|| "Google returned no access token".to_string())
}

/// Reads the `email` claim. The id_token came straight from Google's token endpoint over
/// TLS, so its signature does not need checking (OpenID Connect Core §3.1.3.7).
fn email_from_id_token(id_token: &str) -> Option<String> {
    let payload = id_token.split('.').nth(1)?;
    let bytes = URL_SAFE_NO_PAD.decode(payload.trim_end_matches('=')).or_else(|_| URL_SAFE.decode(payload)).ok()?;
    let claims: Value = serde_json::from_slice(&bytes).ok()?;
    claims["email"].as_str().map(str::to_string)
}

// ── API ───────────────────────────────────────────────────────────────────────

async fn api_get(token: &str, url: url::Url) -> Result<Value, String> {
    let resp = client()?.get(url).bearer_auth(token).send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    if status == 401 {
        return Err(auth_err("Google rejected the access token"));
    }
    let json: Value = resp.json().await.map_err(|e| e.to_string())?;
    if status >= 400 {
        let msg = json["error"]["message"].as_str().unwrap_or("request failed");
        return Err(format!("Google Calendar: {msg} (HTTP {status})"));
    }
    Ok(json)
}

#[derive(Serialize)]
pub struct CalendarInfo {
    id: String,
    name: String,
    color: String,
    /// Shown by default: the primary calendar plus the ones checked in Google Calendar.
    selected: bool,
}

async fn list_calendars(token: &str) -> Result<Vec<CalendarInfo>, String> {
    let mut out = Vec::new();
    let mut page: Option<String> = None;
    loop {
        let mut url = url::Url::parse(&format!("{API}/users/me/calendarList")).unwrap();
        url.query_pairs_mut().append_pair("maxResults", "250");
        if let Some(p) = &page {
            url.query_pairs_mut().append_pair("pageToken", p);
        }
        let json = api_get(token, url).await?;
        for item in json["items"].as_array().into_iter().flatten() {
            let Some(id) = item["id"].as_str() else { continue };
            let name = item["summaryOverride"].as_str().or(item["summary"].as_str()).unwrap_or(id);
            out.push(CalendarInfo {
                id: id.to_string(),
                name: name.to_string(),
                color: item["backgroundColor"].as_str().unwrap_or_default().to_string(),
                selected: item["primary"].as_bool().unwrap_or(false) || item["selected"].as_bool().unwrap_or(false),
            });
        }
        page = json["nextPageToken"].as_str().map(str::to_string);
        if page.is_none() {
            return Ok(out);
        }
    }
}

fn to_utc_string(rfc3339: &str) -> Option<String> {
    DateTime::parse_from_rfc3339(rfc3339)
        .ok()
        .map(|d| d.with_timezone(&Utc).format("%Y-%m-%dT%H:%M:%SZ").to_string())
}

/// Maps one item of `events.list` to a `CalEvent`; `None` for cancelled or declined ones.
fn map_event(item: &Value, calendar_id: &str) -> Option<CalEvent> {
    if item["status"].as_str() == Some("cancelled") {
        return None;
    }
    let declined = item["attendees"].as_array().into_iter().flatten().any(|a| {
        a["self"].as_bool() == Some(true) && a["responseStatus"].as_str() == Some("declined")
    });
    if declined {
        return None;
    }
    let id = item["id"].as_str()?.to_string();
    let title = item["summary"].as_str().unwrap_or_default().to_string();
    let (start, end) = (&item["start"], &item["end"]);

    if let (Some(s), Some(e)) = (start["dateTime"].as_str(), end["dateTime"].as_str()) {
        return Some(CalEvent {
            id,
            calendar_id: calendar_id.to_string(),
            title,
            start: to_utc_string(s)?,
            end: to_utc_string(e)?,
            all_day: false,
            start_date: None,
            end_date: None,
        });
    }
    let s = start["date"].as_str()?;
    Some(CalEvent {
        id,
        calendar_id: calendar_id.to_string(),
        title,
        start: String::new(),
        end: String::new(),
        all_day: true,
        start_date: Some(s.to_string()),
        end_date: Some(end["date"].as_str().unwrap_or(s).to_string()),
    })
}

async fn calendar_events(token: &str, calendar_id: &str, time_min: &str, time_max: &str) -> Result<Vec<CalEvent>, String> {
    let mut out = Vec::new();
    let mut page: Option<String> = None;
    loop {
        let mut url = url::Url::parse(API).unwrap();
        url.path_segments_mut().unwrap().extend(["calendars", calendar_id, "events"]);
        url.query_pairs_mut()
            .append_pair("singleEvents", "true") // expands recurring events server-side
            .append_pair("orderBy", "startTime")
            .append_pair("timeMin", time_min)
            .append_pair("timeMax", time_max)
            .append_pair("maxResults", "2500");
        if let Some(p) = &page {
            url.query_pairs_mut().append_pair("pageToken", p);
        }
        let json = api_get(token, url).await?;
        out.extend(json["items"].as_array().into_iter().flatten().filter_map(|i| map_event(i, calendar_id)));
        page = json["nextPageToken"].as_str().map(str::to_string);
        if page.is_none() {
            return Ok(out);
        }
    }
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectResult {
    account_id: String,
    label: String,
    calendars: Vec<CalendarInfo>,
}

#[tauri::command]
pub fn google_is_configured() -> bool {
    credentials().is_ok()
}

#[tauri::command]
pub async fn google_connect(app: AppHandle, cache: State<'_, TokenCache>) -> Result<ConnectResult, String> {
    let (client_id, client_secret) = credentials()?;

    let listener = TcpListener::bind("127.0.0.1:0").await.map_err(|e| e.to_string())?;
    let redirect_uri = format!("http://127.0.0.1:{}", listener.local_addr().map_err(|e| e.to_string())?.port());
    let verifier = random_token(48);
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let state = random_token(24);

    let auth_url = url::Url::parse_with_params(
        AUTH_URL,
        &[
            ("client_id", client_id),
            ("redirect_uri", &redirect_uri),
            ("response_type", "code"),
            ("scope", SCOPES),
            ("code_challenge", &challenge),
            ("code_challenge_method", "S256"),
            ("state", &state),
            ("access_type", "offline"),
            ("prompt", "consent select_account"),
        ],
    )
    .map_err(|e| e.to_string())?;

    let cancel = Arc::new(Notify::new());
    *cache.pending_login.lock().unwrap() = Some(cancel.clone());
    app.opener().open_url(auth_url.as_str(), None::<&str>).map_err(|e| e.to_string())?;

    let code = tokio::select! {
        r = wait_for_code(&listener, &state) => r,
        _ = cancel.notified() => Err("Google sign-in was cancelled".to_string()),
        _ = tokio::time::sleep(LOGIN_TIMEOUT) => Err("Google sign-in timed out".to_string()),
    };
    *cache.pending_login.lock().unwrap() = None;
    let code = code?;

    let json = token_request(&[
        ("code", &code),
        ("client_id", client_id),
        ("client_secret", client_secret),
        ("redirect_uri", &redirect_uri),
        ("grant_type", "authorization_code"),
        ("code_verifier", &verifier),
    ])
    .await?;

    let refresh = json["refresh_token"].as_str().ok_or("Google returned no refresh token")?;
    let email = json["id_token"]
        .as_str()
        .and_then(email_from_id_token)
        .ok_or("Could not read the Google account's email")?;
    let id = account_id(&email);
    secrets::set(&id, refresh)?;
    let token = remember(&cache, &id, &json).ok_or("Google returned no access token")?;

    let calendars = list_calendars(&token).await?;
    Ok(ConnectResult { account_id: id, label: email, calendars })
}

#[tauri::command]
pub fn google_cancel_connect(cache: State<'_, TokenCache>) {
    if let Some(n) = cache.pending_login.lock().unwrap().take() {
        n.notify_one();
    }
}

#[tauri::command]
pub async fn google_list_calendars(account_id: String, cache: State<'_, TokenCache>) -> Result<Vec<CalendarInfo>, String> {
    let token = access_token(&cache, &account_id).await?;
    list_calendars(&token).await
}

#[tauri::command]
pub async fn google_get_events(
    account_id: String,
    calendar_ids: Vec<String>,
    time_min: String, // RFC 3339
    time_max: String, // RFC 3339, exclusive
    cache: State<'_, TokenCache>,
) -> Result<EventsResult, String> {
    let mut token = access_token(&cache, &account_id).await?;
    let mut result = EventsResult::default();

    for cal_id in &calendar_ids {
        let mut fetched = calendar_events(&token, cal_id, &time_min, &time_max).await;
        if matches!(&fetched, Err(e) if e.starts_with(AUTH_ERR)) {
            // Cached token was revoked early: refresh once and retry.
            cache.tokens.lock().unwrap().remove(&account_id);
            token = access_token(&cache, &account_id).await?;
            fetched = calendar_events(&token, cal_id, &time_min, &time_max).await;
        }
        match fetched {
            Ok(evs) => result.events.extend(evs),
            Err(e) if e.starts_with(AUTH_ERR) => return Err(e),
            Err(e) => result.errors.push(e),
        }
    }
    Ok(result)
}

#[tauri::command]
pub async fn google_disconnect(account_id: String, cache: State<'_, TokenCache>) -> Result<(), String> {
    cache.tokens.lock().unwrap().remove(&account_id);
    if let Ok(Some(refresh)) = secrets::get(&account_id) {
        // Best effort: the local credential is removed even if Google can't be reached.
        if let Ok(c) = client() {
            let _ = c.post(REVOKE_URL).form(&[("token", refresh.as_str())]).send().await;
        }
    }
    secrets::delete(&account_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn maps_timed_event_to_utc() {
        let item = json!({
            "id": "e1", "summary": "Sync", "status": "confirmed",
            "start": { "dateTime": "2026-03-10T10:00:00+03:00" },
            "end":   { "dateTime": "2026-03-10T10:30:00+03:00" }
        });
        let ev = map_event(&item, "cal").unwrap();
        assert_eq!(ev.start, "2026-03-10T07:00:00Z");
        assert_eq!(ev.end, "2026-03-10T07:30:00Z");
        assert!(!ev.all_day);
    }

    #[test]
    fn maps_all_day_event() {
        let item = json!({ "id": "e2", "start": { "date": "2026-04-23" }, "end": { "date": "2026-04-24" } });
        let ev = map_event(&item, "cal").unwrap();
        assert!(ev.all_day);
        assert_eq!(ev.start_date.as_deref(), Some("2026-04-23"));
        assert_eq!(ev.end_date.as_deref(), Some("2026-04-24"));
    }

    #[test]
    fn skips_cancelled_and_declined() {
        let cancelled = json!({ "id": "x", "status": "cancelled", "start": { "date": "2026-04-23" }, "end": { "date": "2026-04-24" } });
        let declined = json!({
            "id": "y", "start": { "date": "2026-04-23" }, "end": { "date": "2026-04-24" },
            "attendees": [ { "email": "me@x.com", "self": true, "responseStatus": "declined" } ]
        });
        assert!(map_event(&cancelled, "c").is_none());
        assert!(map_event(&declined, "c").is_none());
    }

    #[test]
    fn reads_email_from_id_token() {
        let payload = URL_SAFE_NO_PAD.encode(br#"{"email":"me@example.com"}"#);
        assert_eq!(email_from_id_token(&format!("h.{payload}.s")).as_deref(), Some("me@example.com"));
    }
}
