use quick_xml::events::Event;
use quick_xml::Reader;
use reqwest::Client;
use serde_json::{json, Value};

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
                    if !s.is_empty() { results.push(s); }
                    capture_at = None;
                    text.clear();
                }
                depth = depth.saturating_sub(1);
            }
            Ok(Event::Text(ref e)) if capture_at.is_some() => {
                if let Ok(t) = e.unescape() { text.push_str(&t); }
            }
            Ok(Event::CData(ref e)) if capture_at.is_some() => {
                if let Ok(t) = e.clone().escape() {
                    if let Ok(s) = std::str::from_utf8(t.as_ref()) { text.push_str(s); }
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
        let next_d     = xml_lower[pos..].find("<d:response").map(|i| (pos + i, true));
        let next_plain = xml_lower[pos..].find("<response").map(|i| (pos + i, false));

        let (abs_start, is_prefixed) = match (next_d, next_plain) {
            (Some((a, _)), Some((b, _))) => if a <= b { (a, true) } else { (b, false) },
            (Some((a, _)), None)         => (a, true),
            (None, Some((b, _)))         => (b, false),
            (None, None)                 => break,
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

// ── iCal helpers ─────────────────────────────────────────────────────────────

struct VEvent {
    uid: String,
    summary: String,
    dtstart: String,
    dtend: String,
    all_day: bool,
}

/// Parse VEVENT blocks from a VCALENDAR string.
fn parse_vevents(ical: &str) -> Vec<VEvent> {
    let mut events = Vec::new();
    let lines: Vec<&str> = ical.lines().collect();
    let mut i = 0;
    while i < lines.len() {
        if lines[i].trim() == "BEGIN:VEVENT" {
            let mut uid = String::new();
            let mut summary = String::new();
            let mut dtstart = String::new();
            let mut dtend = String::new();
            let mut all_day = false;
            i += 1;
            // Unfold lines (continuation lines start with space/tab)
            let mut unfolded: Vec<String> = Vec::new();
            while i < lines.len() && lines[i].trim() != "END:VEVENT" {
                let line = lines[i];
                if (line.starts_with(' ') || line.starts_with('\t')) && !unfolded.is_empty() {
                    let last = unfolded.last_mut().unwrap();
                    last.push_str(line.trim_start());
                } else {
                    unfolded.push(line.to_string());
                }
                i += 1;
            }
            for line in &unfolded {
                let (key, value) = if let Some(pos) = line.find(':') {
                    (&line[..pos], &line[pos+1..])
                } else { continue; };

                let key_base = key.split(';').next().unwrap_or(key);
                match key_base {
                    "UID"     => uid = value.to_string(),
                    "SUMMARY" => summary = value.to_string(),
                    "DTSTART" => {
                        dtstart = value.to_string();
                        all_day = !value.contains('T');
                    }
                    "DTEND"   => dtend = value.to_string(),
                    _ => {}
                }
            }
            if !dtstart.is_empty() {
                events.push(VEvent { uid, summary, dtstart, dtend, all_day });
            }
        }
        i += 1;
    }
    events
}

/// Convert iCal datetime string to "HH:MM" in local time.
fn ical_to_time(dt: &str) -> String {
    if !dt.contains('T') { return "00:00".to_string(); }
    let t_part = dt.split('T').nth(1).unwrap_or("000000");
    let digits: String = t_part.chars().filter(|c| c.is_ascii_digit()).take(6).collect();
    if digits.len() < 6 { return "00:00".to_string(); }
    let h: u32 = digits[0..2].parse().unwrap_or(0);
    let m: u32 = digits[2..4].parse().unwrap_or(0);

    if t_part.ends_with('Z') {
        let utc_mins = h * 60 + m;
        let local_offset_mins = local_offset_minutes();
        let local_mins = (utc_mins as i64 + local_offset_mins).rem_euclid(24 * 60) as u32;
        return format!("{:02}:{:02}", local_mins / 60, local_mins % 60);
    }
    format!("{:02}:{:02}", h, m)
}

/// Convert iCal datetime string to "YYYY-MM-DD" in local date.
fn ical_to_date(dt: &str) -> String {
    let date_raw: String = dt.chars().filter(|c| c.is_ascii_digit()).take(8).collect();
    if date_raw.len() < 8 { return String::new(); }

    // All-day: no timezone conversion needed
    if !dt.contains('T') {
        return format!("{}-{}-{}", &date_raw[0..4], &date_raw[4..6], &date_raw[6..8]);
    }

    let t_part = dt.split('T').nth(1).unwrap_or("");
    let time_digits: String = t_part.chars().filter(|c| c.is_ascii_digit()).take(4).collect();

    if t_part.ends_with('Z') && time_digits.len() == 4 {
        let h: i64 = time_digits[0..2].parse().unwrap_or(0);
        let m: i64 = time_digits[2..4].parse().unwrap_or(0);
        let utc_mins = h * 60 + m;
        let local_mins = utc_mins + local_offset_minutes();
        // Detect day boundary crossing
        let day_delta: i64 = if local_mins < 0 { -1 } else if local_mins >= 1440 { 1 } else { 0 };
        if day_delta != 0 {
            // Adjust date by parsing year/month/day and computing offset days
            let y: i32 = date_raw[0..4].parse().unwrap_or(2026);
            let mo: u32 = date_raw[4..6].parse().unwrap_or(1);
            let d: i32 = date_raw[6..8].parse().unwrap_or(1);
            let days_in_month = [0u32,31,28,31,30,31,30,31,31,30,31,30,31];
            let leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
            let dim = if mo == 2 && leap { 29 } else { days_in_month[mo as usize] };
            let new_d = d + day_delta as i32;
            let (fy, fmo, fd) = if new_d < 1 {
                let pm = if mo == 1 { 12 } else { mo - 1 };
                let py = if mo == 1 { y - 1 } else { y };
                let pdim = if pm == 2 && ((py % 4 == 0 && py % 100 != 0) || py % 400 == 0) { 29 } else { days_in_month[pm as usize] };
                (py, pm, pdim as i32)
            } else if new_d > dim as i32 {
                let nm = if mo == 12 { 1 } else { mo + 1 };
                let ny = if mo == 12 { y + 1 } else { y };
                (ny, nm, 1i32)
            } else {
                (y, mo, new_d)
            };
            return format!("{:04}-{:02}-{:02}", fy, fmo, fd);
        }
    }

    format!("{}-{}-{}", &date_raw[0..4], &date_raw[4..6], &date_raw[6..8])
}

/// Get local UTC offset in minutes using system time.
fn local_offset_minutes() -> i64 {
    // Compare local time vs UTC by formatting with strftime-like approach
    // Use std::time for a simple approach
    let utc = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    // Get local time struct via libc
    unsafe {
        let t = utc as libc::time_t;
        let mut local_tm: libc::tm = std::mem::zeroed();
        libc::localtime_r(&t, &mut local_tm);
        let local_mins = local_tm.tm_hour as i64 * 60 + local_tm.tm_min as i64;
        let utc_mins = ((utc / 3600) % 24) as i64 * 60 + ((utc / 60) % 60) as i64;
        let mut offset = local_mins - utc_mins;
        if offset > 720 { offset -= 1440; }
        if offset < -720 { offset += 1440; }
        offset
    }
}

// ── CalDAV client ─────────────────────────────────────────────────────────────

fn make_client() -> Result<Client, String> {
    Client::builder()
        .redirect(reqwest::redirect::Policy::none()) // handle redirects manually
        .build()
        .map_err(|e| e.to_string())
}

const ICLOUD_BASE: &str = "https://caldav.icloud.com";

async fn propfind(client: &Client, url: &str, email: &str, pass: &str, depth: &str, body: &str) -> Result<(String, String), String> {
    let mut current_url = url.to_string();

    // Follow redirects manually so PROPFIND method is preserved
    for _ in 0..5 {
        let resp = client
            .request(reqwest::Method::from_bytes(b"PROPFIND").unwrap(), &current_url)
            .basic_auth(email, Some(pass))
            .header("Depth", depth)
            .header("Content-Type", "application/xml; charset=utf-8")
            .body(body.to_string())
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = resp.status().as_u16();

        if status >= 300 && status < 400 {
            if let Some(location) = resp.headers().get("location") {
                let loc = location.to_str().map_err(|e| e.to_string())?;
                if loc.starts_with("http") {
                    current_url = loc.to_string();
                } else {
                    // Relative redirect
                    let base = url.split('/').take(3).collect::<Vec<_>>().join("/");
                    current_url = format!("{}{}", base, loc);
                }
                continue;
            }
        }

        let final_url = current_url.clone();
        let text = resp.text().await.map_err(|e| e.to_string())?;
        return Ok((text, final_url));
    }

    Err("Too many redirects".to_string())
}

async fn report(client: &Client, url: &str, email: &str, pass: &str, body: &str) -> Result<String, String> {
    let mut current_url = url.to_string();

    for _ in 0..5 {
        let resp = client
            .request(reqwest::Method::from_bytes(b"REPORT").unwrap(), &current_url)
            .basic_auth(email, Some(pass))
            .header("Depth", "1")
            .header("Content-Type", "application/xml; charset=utf-8")
            .body(body.to_string())
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = resp.status().as_u16();

        if status >= 300 && status < 400 {
            if let Some(location) = resp.headers().get("location") {
                let loc = location.to_str().map_err(|e| e.to_string())?;
                current_url = if loc.starts_with("http") {
                    loc.to_string()
                } else {
                    let base = url.split('/').take(3).collect::<Vec<_>>().join("/");
                    format!("{}{}", base, loc)
                };
                continue;
            }
        }

        return resp.text().await.map_err(|e| e.to_string());
    }

    Err("Too many redirects".to_string())
}

#[tauri::command]
async fn caldav_connect(email: String, password: String) -> Result<String, String> {
    let client = make_client()?;

    // 1. Discover principal URL via well-known endpoint (iCloud 301-redirects to principal)
    let (xml, final_url) = propfind(
        &client, &format!("{}/.well-known/caldav", ICLOUD_BASE), &email, &password, "0",
        r#"<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>"#,
    ).await?;

    // Try to find principal href in XML body; fall back to the redirect destination URL
    let hrefs = xml_find_all(&xml, "href");
    let principal_url = if let Some(p) = hrefs.iter().find(|h| h.contains("/principal")) {
        if p.starts_with("http") { p.clone() } else { format!("{}{}", ICLOUD_BASE, p) }
    } else if final_url.contains("/principal") {
        final_url.clone()
    } else {
        return Err("Could not find principal URL — check credentials".to_string());
    };

    // 2. Get calendar home set
    let (xml, _) = propfind(
        &client, &principal_url, &email, &password, "0",
        r#"<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>"#,
    ).await?;

    let hrefs = xml_find_all(&xml, "href");
    let home_path = hrefs.iter()
        .find(|h| h.contains("/calendars") || (h.len() > 5 && !h.contains("principal")))
        .cloned()
        .unwrap_or_else(|| principal_url.replace("/principal/", "/calendars/"));

    let home_url = if home_path.starts_with("http") {
        home_path
    } else {
        format!("{}{}", ICLOUD_BASE, home_path)
    };

    // 3. List calendars (including Apple-specific calendar-color)
    let (xml, _) = propfind(
        &client, &home_url, &email, &password, "1",
        r#"<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:i="http://apple.com/ns/ical/"><d:prop><d:displayname/><d:resourcetype/><c:supported-calendar-component-set/><i:calendar-color/></d:prop></d:propfind>"#,
    ).await?;

    let mut calendars: Vec<Value> = Vec::new();
    for block in split_responses(&xml) {
        let href = xml_find_first(&block, "href").unwrap_or_default();
        let name = xml_find_first(&block, "displayname").unwrap_or_default();
        if href.is_empty() || name.is_empty() { continue; }

        // Skip the calendar home root itself
        if href.ends_with("/calendars/") || href.ends_with("/calendars") { continue; }

        // A calendar resource has <calendar .../> in its resourcetype.
        // Handles both prefixed (<cd:calendar/>) and default-namespace (<calendar xmlns=.../>).
        let block_lower = block.to_lowercase();
        let is_calendar_resource = block_lower.contains(":calendar/>") ||
            block_lower.contains(":calendar />") ||
            block_lower.contains("<calendar/>") ||
            block_lower.contains("<calendar />") ||
            block_lower.contains("<calendar xmlns");

        if is_calendar_resource {
            let full_href = if href.starts_with("http") {
                href.clone()
            } else {
                format!("{}{}", ICLOUD_BASE, href)
            };
            // calendar-color comes as #RRGGBBAA — drop the alpha channel
            let color_raw = xml_find_first(&block, "calendar-color").unwrap_or_default();
            let color = if color_raw.len() >= 7 && color_raw.starts_with('#') {
                color_raw[..7].to_string()
            } else {
                String::new()
            };
            calendars.push(json!({ "id": href, "name": name, "href": full_href, "color": color }));
        }
    }

    Ok(serde_json::to_string(&calendars).unwrap_or_default())
}

#[tauri::command]
async fn caldav_get_events(
    email: String,
    password: String,
    calendar_hrefs: Vec<String>,
    start_date: String, // "YYYY-MM-DD"
    end_date: String,   // "YYYY-MM-DD" (inclusive)
) -> Result<String, String> {
    let client = make_client()?;

    let start_raw = start_date.replace('-', "");
    let end_raw   = end_date.replace('-', "");
    let start = format!("{}T000000Z", start_raw);
    let end   = format!("{}T235959Z", end_raw);

    let report_body = format!(
        r#"<?xml version="1.0"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="{}" end="{}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>"#,
        start, end
    );

    let mut all_events: Vec<Value> = Vec::new();

    for href in &calendar_hrefs {
        let url = if href.starts_with("http") { href.clone() } else { format!("{}{}", ICLOUD_BASE, href) };
        let xml = match report(&client, &url, &email, &password, &report_body).await {
            Ok(x) => x,
            Err(_) => continue,
        };

        for block in split_responses(&xml) {
            let cal_data_values = xml_find_all(&block, "calendar-data");
            let ical = cal_data_values.first().cloned().unwrap_or_default();
            if ical.is_empty() { continue; }

            // Extract calendar name from href for labeling
            let cal_href = xml_find_first(&block, "href").unwrap_or_default();

            for ev in parse_vevents(&ical) {
                if ev.all_day { continue; }
                let start_time = ical_to_time(&ev.dtstart);
                let end_time   = if ev.dtend.is_empty() { start_time.clone() } else { ical_to_time(&ev.dtend) };
                let date       = ical_to_date(&ev.dtstart);
                all_events.push(json!({
                    "id": ev.uid,
                    "title": ev.summary,
                    "startTime": start_time,
                    "endTime": end_time,
                    "calHref": cal_href,
                    "allDay": false,
                    "date": date,
                }));
            }
        }
    }

    Ok(serde_json::to_string(&all_events).unwrap_or_default())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            caldav_connect,
            caldav_get_events,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
