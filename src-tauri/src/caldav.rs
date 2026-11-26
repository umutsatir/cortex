//! iCloud CalDAV (read-only). The app-specific password is kept in the Keychain.

use chrono::{DateTime, Utc};
use quick_xml::events::Event;
use quick_xml::Reader;
use reqwest::Client;
use serde::Serialize;

use crate::events::{auth_err, EventsResult};
use crate::{ical, secrets};

const ICLOUD_BASE: &str = "https://caldav.icloud.com";

// ── XML helpers ───────────────────────────────────────────────────────────────

/// Extract text content from all elements with the given local name (ignores NS prefix).
fn xml_find_all(xml: &str, local_name: &str) -> Vec<String> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);
    let mut buf = Vec::new();
    let mut results = Vec::new();
    let mut capture_at: Option<usize> = None;
    let mut depth = 0usize;
    let mut text = String::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                depth += 1;
                if e.local_name().as_ref() == local_name.as_bytes() && capture_at.is_none() {
                    capture_at = Some(depth);
                    text.clear();
                }
            }
            Ok(Event::End(_)) => {
                if capture_at == Some(depth) {
                    let s = text.trim().to_string();
                    if !s.is_empty() {
                        results.push(s);
                    }
                    capture_at = None;
                    text.clear();
                }
                depth = depth.saturating_sub(1);
            }
            Ok(Event::Text(ref e)) if capture_at.is_some() => {
                if let Ok(t) = e.unescape() {
                    text.push_str(&t);
                }
            }
            Ok(Event::CData(ref e)) if capture_at.is_some() => {
                if let Ok(s) = std::str::from_utf8(e.as_ref()) {
                    text.push_str(s);
                }
            }
            Ok(Event::Eof) | Err(_) => break,
            _ => {}
        }
        buf.clear();
    }
    results
}

fn xml_find_first(xml: &str, local_name: &str) -> Option<String> {
    xml_find_all(xml, local_name).into_iter().next()
}

/// Split multistatus XML into individual response blocks.
/// Handles both prefixed (<d:response>, <D:response>) and default-namespace (<response xmlns="DAV:">) forms.
fn split_responses(xml: &str) -> Vec<String> {
    let mut blocks = Vec::new();
    let xml_lower = xml.to_lowercase();
    let mut pos = 0;

    loop {
        let next_d = xml_lower[pos..].find("<d:response").map(|i| (pos + i, true));
        let next_plain = xml_lower[pos..].find("<response").map(|i| (pos + i, false));

        let (abs_start, is_prefixed) = match (next_d, next_plain) {
            (Some((a, _)), Some((b, _))) => if a <= b { (a, true) } else { (b, false) },
            (Some((a, _)), None) => (a, true),
            (None, Some((b, _))) => (b, false),
            (None, None) => break,
        };

        let (open_prefix, close_tag) = if is_prefixed {
            ("<d:response", "</d:response>")
        } else {
            ("<response", "</response>")
        };

        // Guard against partial matches like <response-description>
        let next_ch = xml_lower[abs_start + open_prefix.len()..].chars().next();
        if !matches!(next_ch, Some('>' | ' ' | '\t' | '\n' | '\r' | '/')) {
            pos = abs_start + 1;
            continue;
        }

        let after_prefix = abs_start + open_prefix.len();
        if let Some(close_rel) = xml_lower[after_prefix..].find(close_tag) {
            let abs_end = after_prefix + close_rel + close_tag.len();
            blocks.push(xml[abs_start..abs_end].to_string());
            pos = abs_end;
        } else {
            break;
        }
    }
    blocks
}

fn absolute(href: &str) -> String {
    if href.starts_with("http") { href.to_string() } else { format!("{ICLOUD_BASE}{href}") }
}

// ── HTTP ──────────────────────────────────────────────────────────────────────

fn make_client() -> Result<Client, String> {
    Client::builder()
        .redirect(reqwest::redirect::Policy::none()) // handle redirects manually
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())
}

/// Sends a WebDAV request, following redirects manually so the method is preserved.
/// Returns the body and the final URL.
async fn dav(client: &Client, method: &str, url: &str, email: &str, pass: &str, depth: &str, body: &str) -> Result<(String, String), String> {
    let mut current_url = url.to_string();
    let method = reqwest::Method::from_bytes(method.as_bytes()).map_err(|e| e.to_string())?;

    for _ in 0..5 {
        let resp = client
            .request(method.clone(), &current_url)
            .basic_auth(email, Some(pass))
            .header("Depth", depth)
            .header("Content-Type", "application/xml; charset=utf-8")
            .body(body.to_string())
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = resp.status().as_u16();
        if (300..400).contains(&status) {
            if let Some(location) = resp.headers().get("location") {
                let loc = location.to_str().map_err(|e| e.to_string())?;
                current_url = if loc.starts_with("http") {
                    loc.to_string()
                } else {
                    let base = url.split('/').take(3).collect::<Vec<_>>().join("/");
                    format!("{base}{loc}")
                };
                continue;
            }
        }
        if status == 401 {
            return Err(auth_err("Apple ID or app-specific password was rejected"));
        }
        // 403 is per-resource (e.g. a shared calendar or reminders list), not bad credentials.
        if status >= 400 {
            return Err(format!("CalDAV request failed (HTTP {status})"));
        }
        let text = resp.text().await.map_err(|e| e.to_string())?;
        return Ok((text, current_url));
    }

    Err("Too many redirects".to_string())
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct CalendarInfo {
    /// Absolute calendar URL; also used as the calendar id.
    id: String,
    name: String,
    color: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectResult {
    account_id: String,
    label: String,
    calendars: Vec<CalendarInfo>,
}

pub fn account_id(email: &str) -> String {
    format!("apple:{}", email.trim().to_lowercase())
}

async fn discover_calendars(client: &Client, email: &str, password: &str) -> Result<Vec<CalendarInfo>, String> {
    // 1. Principal URL via well-known endpoint (iCloud 301-redirects to principal)
    let (xml, final_url) = dav(
        client, "PROPFIND", &format!("{ICLOUD_BASE}/.well-known/caldav"), email, password, "0",
        r#"<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>"#,
    ).await?;

    let hrefs = xml_find_all(&xml, "href");
    let principal_url = if let Some(p) = hrefs.iter().find(|h| h.contains("/principal")) {
        absolute(p)
    } else if final_url.contains("/principal") {
        final_url
    } else {
        return Err("Could not find principal URL — check credentials".to_string());
    };

    // 2. Calendar home set
    let (xml, _) = dav(
        client, "PROPFIND", &principal_url, email, password, "0",
        r#"<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>"#,
    ).await?;

    let hrefs = xml_find_all(&xml, "href");
    let home_url = hrefs
        .iter()
        .find(|h| h.contains("/calendars") || (h.len() > 5 && !h.contains("principal")))
        .map(|h| absolute(h))
        .unwrap_or_else(|| principal_url.replace("/principal/", "/calendars/"));

    // 3. Calendars (including Apple-specific calendar-color)
    let (xml, _) = dav(
        client, "PROPFIND", &home_url, email, password, "1",
        r#"<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:i="http://apple.com/ns/ical/"><d:prop><d:displayname/><d:resourcetype/><c:supported-calendar-component-set/><i:calendar-color/></d:prop></d:propfind>"#,
    ).await?;

    let mut calendars = Vec::new();
    for block in split_responses(&xml) {
        let href = xml_find_first(&block, "href").unwrap_or_default();
        let name = xml_find_first(&block, "displayname").unwrap_or_default();
        if href.is_empty() || name.is_empty() {
            continue;
        }
        if href.ends_with("/calendars/") || href.ends_with("/calendars") {
            continue;
        }

        // A calendar resource has <calendar .../> in its resourcetype.
        let lower = block.to_lowercase();
        let is_calendar = lower.contains(":calendar/>")
            || lower.contains(":calendar />")
            || lower.contains("<calendar/>")
            || lower.contains("<calendar />")
            || lower.contains("<calendar xmlns");
        // Skip reminder lists: collections that explicitly support VTODO but not VEVENT.
        let reminders_only = lower.contains("vtodo") && !lower.contains("vevent");
        if !is_calendar || reminders_only {
            continue;
        }

        // calendar-color comes as #RRGGBBAA — drop the alpha channel
        let color_raw = xml_find_first(&block, "calendar-color").unwrap_or_default();
        let color = if color_raw.len() >= 7 && color_raw.starts_with('#') { color_raw[..7].to_string() } else { String::new() };
        calendars.push(CalendarInfo { id: absolute(&href), name, color });
    }
    if calendars.is_empty() {
        return Err("No calendars found".to_string());
    }
    Ok(calendars)
}

#[tauri::command]
pub async fn caldav_connect(email: String, password: String) -> Result<ConnectResult, String> {
    let email = email.trim().to_string();
    let client = make_client()?;
    let calendars = discover_calendars(&client, &email, &password).await?;
    let id = account_id(&email);
    secrets::set(&id, &password)?;
    Ok(ConnectResult { account_id: id, label: email, calendars })
}

/// Re-reads the calendar list with the stored password (new calendars, renamed ones).
#[tauri::command]
pub async fn caldav_list_calendars(account_id: String, email: String) -> Result<Vec<CalendarInfo>, String> {
    let password = secrets::get(&account_id)?.ok_or_else(|| auth_err("No stored password"))?;
    discover_calendars(&make_client()?, &email, &password).await
}

/// One-time move of a password that older versions kept in localStorage.
#[tauri::command]
pub fn caldav_migrate_secret(email: String, password: String) -> Result<String, String> {
    let id = account_id(&email);
    secrets::set(&id, &password)?;
    Ok(id)
}

fn caldav_time(dt: &DateTime<Utc>) -> String {
    dt.format("%Y%m%dT%H%M%SZ").to_string()
}

#[tauri::command]
pub async fn caldav_get_events(
    account_id: String,
    email: String,
    calendar_ids: Vec<String>,
    time_min: String, // RFC 3339
    time_max: String, // RFC 3339, exclusive
) -> Result<EventsResult, String> {
    let password = secrets::get(&account_id)?.ok_or_else(|| auth_err("No stored password"))?;
    let from = DateTime::parse_from_rfc3339(&time_min).map_err(|e| e.to_string())?.with_timezone(&Utc);
    let to = DateTime::parse_from_rfc3339(&time_max).map_err(|e| e.to_string())?.with_timezone(&Utc);
    let (start, end) = (caldav_time(&from), caldav_time(&to));

    // <c:expand> makes the server return each occurrence of recurring events as its
    // own VEVENT in UTC; ical::events_in_range still expands if a server ignores it.
    let body = format!(
        r#"<?xml version="1.0"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag/><c:calendar-data><c:expand start="{start}" end="{end}"/></c:calendar-data></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="{start}" end="{end}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>"#
    );

    let client = make_client()?;
    let mut result = EventsResult::default();

    for cal_id in &calendar_ids {
        let xml = match dav(&client, "REPORT", &absolute(cal_id), &email, &password, "1", &body).await {
            Ok((x, _)) => x,
            Err(e) if e.starts_with(crate::events::AUTH_ERR) => return Err(e),
            Err(e) => {
                result.errors.push(e);
                continue;
            }
        };
        for block in split_responses(&xml) {
            for ics in xml_find_all(&block, "calendar-data") {
                result.events.extend(ical::events_in_range(&ics, cal_id, from, to));
            }
        }
    }

    // A server-expanded series and the fallback expansion can both produce an instance.
    let mut seen = std::collections::HashSet::new();
    result.events.retain(|e| seen.insert((e.calendar_id.clone(), e.id.clone())));
    Ok(result)
}
