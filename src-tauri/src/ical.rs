//! Minimal iCalendar (RFC 5545) VEVENT parsing and recurrence expansion.
//!
//! CalDAV servers are asked to expand recurrences themselves (`<c:expand>`), but not all
//! do, so RRULE/RDATE/EXDATE/RECURRENCE-ID are also handled here as a fallback.

use std::collections::{HashMap, HashSet};

use chrono::{DateTime, Duration, Local, NaiveDate, NaiveDateTime, TimeZone, Utc};
use rrule::{RRule, Tz as RTz, Unvalidated};

use crate::events::CalEvent;

// ── Values ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum When {
    Date(NaiveDate),
    Utc(DateTime<Utc>),
    Zoned(NaiveDateTime, chrono_tz::Tz),
    /// No zone at all: the event happens at this wall-clock time wherever the user is.
    Floating(NaiveDateTime),
}

impl When {
    fn is_date(&self) -> bool {
        matches!(self, When::Date(_))
    }

    /// The instant this value denotes (all-day dates are taken at UTC midnight).
    fn instant(&self) -> Option<DateTime<Utc>> {
        match self {
            When::Date(d) => Some(Utc.from_utc_datetime(&d.and_hms_opt(0, 0, 0)?)),
            When::Utc(dt) => Some(*dt),
            When::Zoned(n, tz) => tz.from_local_datetime(n).earliest().map(|d| d.with_timezone(&Utc)),
            When::Floating(n) => Local.from_local_datetime(n).earliest().map(|d| d.with_timezone(&Utc)),
        }
    }

    /// Adds a duration; zoned and floating values move in wall-clock time so a 1h event
    /// stays 1h of local time across DST changes.
    fn add(&self, d: Duration) -> When {
        match self {
            When::Date(x) => When::Date(*x + Duration::days(d.num_days())),
            When::Utc(x) => When::Utc(*x + d),
            When::Zoned(n, tz) => When::Zoned(*n + d, *tz),
            When::Floating(n) => When::Floating(*n + d),
        }
    }

    fn to_rrule_dt(&self) -> Option<DateTime<RTz>> {
        match self {
            When::Date(d) => RTz::UTC.from_local_datetime(&d.and_hms_opt(0, 0, 0)?).earliest(),
            When::Utc(dt) => Some(dt.with_timezone(&RTz::UTC)),
            When::Zoned(n, tz) => RTz::Tz(*tz).from_local_datetime(n).earliest(),
            When::Floating(n) => RTz::LOCAL.from_local_datetime(n).earliest(),
        }
    }

    /// Rebuilds a value of the same kind as `self` from an rrule occurrence.
    fn same_kind(&self, dt: &DateTime<RTz>) -> When {
        match self {
            When::Date(_) => When::Date(dt.date_naive()),
            When::Utc(_) => When::Utc(dt.with_timezone(&Utc)),
            When::Zoned(_, tz) => When::Zoned(dt.naive_local(), *tz),
            When::Floating(_) => When::Floating(dt.naive_local()),
        }
    }

    /// Key used to match RECURRENCE-ID / EXDATE against generated occurrences.
    fn match_key(&self) -> String {
        match self {
            When::Date(d) => d.format("%Y-%m-%d").to_string(),
            other => other.instant().map(|i| i.timestamp().to_string()).unwrap_or_default(),
        }
    }

    fn to_output(&self) -> String {
        match self {
            When::Date(d) => d.format("%Y-%m-%d").to_string(),
            When::Floating(n) => n.format("%Y-%m-%dT%H:%M:%S").to_string(),
            other => other
                .instant()
                .map(|i| i.format("%Y-%m-%dT%H:%M:%SZ").to_string())
                .unwrap_or_default(),
        }
    }
}

// ── Content lines ─────────────────────────────────────────────────────────────

struct Prop {
    name: String,
    params: Vec<(String, String)>,
    value: String,
}

impl Prop {
    fn param(&self, key: &str) -> Option<&str> {
        self.params.iter().find(|(k, _)| k == key).map(|(_, v)| v.as_str())
    }
}

/// Joins folded lines (continuations start with one space or tab).
fn unfold(ical: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for raw in ical.split('\n') {
        let line = raw.strip_suffix('\r').unwrap_or(raw);
        if (line.starts_with(' ') || line.starts_with('\t')) && !out.is_empty() {
            out.last_mut().unwrap().push_str(&line[1..]);
        } else if !line.is_empty() {
            out.push(line.to_string());
        }
    }
    out
}

fn parse_prop(line: &str) -> Option<Prop> {
    let mut in_quotes = false;
    let colon = line.char_indices().find_map(|(i, c)| {
        if c == '"' {
            in_quotes = !in_quotes;
        }
        (c == ':' && !in_quotes).then_some(i)
    })?;
    let (head, value) = (&line[..colon], &line[colon + 1..]);
    let mut parts = head.split(';');
    let name = parts.next()?.trim().to_ascii_uppercase();
    let params = parts
        .filter_map(|p| p.split_once('='))
        .map(|(k, v)| (k.trim().to_ascii_uppercase(), v.trim().trim_matches('"').to_string()))
        .collect();
    Some(Prop { name, params, value: value.to_string() })
}

fn unescape_text(v: &str) -> String {
    let mut out = String::with_capacity(v.len());
    let mut chars = v.chars();
    while let Some(c) = chars.next() {
        if c == '\\' {
            match chars.next() {
                Some('n') | Some('N') => out.push(' '),
                Some(other) => out.push(other),
                None => {}
            }
        } else {
            out.push(c);
        }
    }
    out
}

/// Resolves a TZID, including vendor-prefixed ones like
/// `/freeassociation.sourceforge.net/Tzfile/Europe/Istanbul`.
fn parse_tzid(tzid: &str) -> Option<chrono_tz::Tz> {
    if let Ok(tz) = tzid.parse() {
        return Some(tz);
    }
    let segs: Vec<&str> = tzid.split('/').filter(|s| !s.is_empty()).collect();
    for take in [3, 2, 1] {
        if segs.len() >= take {
            if let Ok(tz) = segs[segs.len() - take..].join("/").parse() {
                return Some(tz);
            }
        }
    }
    None
}

fn parse_one_when(v: &str, value_type: Option<&str>, tzid: Option<&str>) -> Option<When> {
    let v = v.trim();
    let is_date = value_type.is_some_and(|t| t.eq_ignore_ascii_case("DATE")) || (v.len() == 8 && !v.contains('T'));
    if is_date {
        return NaiveDate::parse_from_str(v.get(..8)?, "%Y%m%d").ok().map(When::Date);
    }
    let (body, utc) = match v.strip_suffix('Z') {
        Some(b) => (b, true),
        None => (v, false),
    };
    let ndt = NaiveDateTime::parse_from_str(body, "%Y%m%dT%H%M%S").ok()?;
    if utc {
        return Some(When::Utc(Utc.from_utc_datetime(&ndt)));
    }
    match tzid.and_then(parse_tzid) {
        Some(tz) => Some(When::Zoned(ndt, tz)),
        None => Some(When::Floating(ndt)),
    }
}

fn parse_when_list(p: &Prop) -> Vec<When> {
    p.value
        .split(',')
        .filter_map(|v| parse_one_when(v, p.param("VALUE"), p.param("TZID")))
        .collect()
}

/// Parses an RFC 5545 DURATION such as `PT1H30M`, `P1D`, `-PT15M`, `P2W`.
fn parse_duration(s: &str) -> Option<Duration> {
    let s = s.trim();
    let (neg, s) = match s.strip_prefix('-') {
        Some(r) => (true, r),
        None => (false, s.strip_prefix('+').unwrap_or(s)),
    };
    let s = s.strip_prefix('P')?;
    let mut total = Duration::zero();
    let mut num = String::new();
    let mut in_time = false;
    for c in s.chars() {
        match c {
            'T' => in_time = true,
            '0'..='9' => num.push(c),
            _ => {
                let n: i64 = num.parse().ok()?;
                num.clear();
                total += match (c, in_time) {
                    ('W', false) => Duration::weeks(n),
                    ('D', false) => Duration::days(n),
                    ('H', true) => Duration::hours(n),
                    ('M', true) => Duration::minutes(n),
                    ('S', true) => Duration::seconds(n),
                    _ => return None,
                };
            }
        }
    }
    Some(if neg { -total } else { total })
}

// ── VEVENT ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct VEvent {
    pub uid: String,
    pub summary: String,
    pub start: When,
    end: Option<When>,
    duration: Option<Duration>,
    rrules: Vec<String>,
    rdates: Vec<When>,
    exdates: Vec<When>,
    recurrence_id: Option<When>,
    cancelled: bool,
}

impl VEvent {
    /// Length of one occurrence.
    fn length(&self) -> Duration {
        if let Some(end) = &self.end {
            return match (&self.start, end) {
                (When::Date(a), When::Date(b)) => Duration::days((*b - *a).num_days()),
                (a, b) => match (a.instant(), b.instant()) {
                    (Some(x), Some(y)) => y - x,
                    _ => Duration::zero(),
                },
            };
        }
        if let Some(d) = self.duration {
            return d;
        }
        if self.start.is_date() { Duration::days(1) } else { Duration::zero() }
    }
}

pub fn parse_vevents(ical: &str) -> Vec<VEvent> {
    let mut events = Vec::new();
    let mut cur: Option<HashMap<&'static str, Vec<Prop>>> = None;
    // Depth of components nested inside the current VEVENT (e.g. VALARM), whose
    // properties must not leak into the event.
    let mut nested = 0usize;

    for line in unfold(ical) {
        let Some(prop) = parse_prop(&line) else { continue };
        match (prop.name.as_str(), prop.value.trim().to_ascii_uppercase().as_str()) {
            ("BEGIN", "VEVENT") if cur.is_none() => {
                cur = Some(HashMap::new());
                nested = 0;
                continue;
            }
            ("BEGIN", _) if cur.is_some() => {
                nested += 1;
                continue;
            }
            ("END", "VEVENT") if nested == 0 => {
                if let Some(props) = cur.take() {
                    if let Some(ev) = build_vevent(props) {
                        events.push(ev);
                    }
                }
                continue;
            }
            ("END", _) if cur.is_some() => {
                nested = nested.saturating_sub(1);
                continue;
            }
            _ => {}
        }
        if nested > 0 {
            continue;
        }
        if let Some(props) = cur.as_mut() {
            let key: &'static str = match prop.name.as_str() {
                "UID" => "UID",
                "SUMMARY" => "SUMMARY",
                "DTSTART" => "DTSTART",
                "DTEND" => "DTEND",
                "DURATION" => "DURATION",
                "RRULE" => "RRULE",
                "RDATE" => "RDATE",
                "EXDATE" => "EXDATE",
                "RECURRENCE-ID" => "RECURRENCE-ID",
                "STATUS" => "STATUS",
                _ => continue,
            };
            props.entry(key).or_default().push(prop);
        }
    }
    events
}

fn build_vevent(mut p: HashMap<&'static str, Vec<Prop>>) -> Option<VEvent> {
    let first = |p: &HashMap<&'static str, Vec<Prop>>, k: &str| p.get(k).and_then(|v| v.first().map(|x| x.value.clone()));
    let when = |p: &HashMap<&'static str, Vec<Prop>>, k: &str| p.get(k).and_then(|v| v.first()).and_then(|x| parse_when_list(x).into_iter().next());

    let start = when(&p, "DTSTART")?;
    Some(VEvent {
        uid: first(&p, "UID").unwrap_or_default(),
        summary: first(&p, "SUMMARY").map(|s| unescape_text(&s)).unwrap_or_default(),
        end: when(&p, "DTEND"),
        duration: first(&p, "DURATION").and_then(|d| parse_duration(&d)),
        rrules: p.remove("RRULE").unwrap_or_default().into_iter().map(|x| x.value).collect(),
        rdates: p.remove("RDATE").unwrap_or_default().iter().flat_map(parse_when_list).collect(),
        exdates: p.remove("EXDATE").unwrap_or_default().iter().flat_map(parse_when_list).collect(),
        recurrence_id: when(&p, "RECURRENCE-ID"),
        cancelled: first(&p, "STATUS").is_some_and(|s| s.trim().eq_ignore_ascii_case("CANCELLED")),
        start,
    })
}

// ── Expansion ─────────────────────────────────────────────────────────────────

/// Occurrence start times of a recurring master inside `[from, to)`.
fn expand_master(ev: &VEvent, from: DateTime<Utc>, to: DateTime<Utc>) -> Vec<When> {
    let Some(dtstart) = ev.start.to_rrule_dt() else { return vec![ev.start.clone()] };
    let mut out: Vec<When> = Vec::new();

    for rule in &ev.rrules {
        let rule = rule.trim().trim_start_matches("RRULE:");
        let built = rule
            .parse::<RRule<Unvalidated>>()
            .and_then(|r| r.build(dtstart));
        match built {
            Ok(set) => {
                let set = set
                    .after(from.with_timezone(&RTz::UTC))
                    .before(to.with_timezone(&RTz::UTC));
                out.extend(set.all(2000).dates.iter().map(|d| ev.start.same_kind(d)));
            }
            // Unsupported/invalid rule: show the first occurrence rather than nothing.
            Err(_) => out.push(ev.start.clone()),
        }
    }
    out.push(ev.start.clone()); // DTSTART always counts as an occurrence
    out.extend(ev.rdates.iter().cloned());

    let mut seen = HashSet::new();
    out.retain(|w| seen.insert(w.match_key()));
    out
}

/// Turns calendar data into concrete event instances overlapping `[from, to)`.
pub fn events_in_range(ical: &str, calendar_id: &str, from: DateTime<Utc>, to: DateTime<Utc>) -> Vec<CalEvent> {
    let vevents = parse_vevents(ical);

    // RECURRENCE-ID overrides replace (or cancel) the generated occurrence they name.
    let mut overridden: HashMap<String, HashSet<String>> = HashMap::new();
    for ev in &vevents {
        if let Some(rid) = &ev.recurrence_id {
            overridden.entry(ev.uid.clone()).or_default().insert(rid.match_key());
        }
    }

    // Widen the expansion window so events that started before `from` but are still
    // running (or all-day events in other zones) are not lost; filtered precisely below.
    let pad = Duration::days(2);
    let mut out = Vec::new();

    for ev in &vevents {
        let len = ev.length();
        let starts: Vec<When> = if ev.recurrence_id.is_some() || ev.rrules.is_empty() && ev.rdates.is_empty() {
            if ev.cancelled { continue; }
            vec![ev.start.clone()]
        } else {
            if ev.cancelled { continue; }
            let excluded: HashSet<String> = ev
                .exdates
                .iter()
                .map(When::match_key)
                .chain(overridden.get(&ev.uid).into_iter().flatten().cloned())
                .collect();
            expand_master(ev, from - len - pad, to + pad)
                .into_iter()
                .filter(|w| !excluded.contains(&w.match_key()))
                .collect()
        };

        for start in starts {
            let end = start.add(len);
            let (Some(s), Some(e)) = (start.instant(), end.instant()) else { continue };
            let overlaps = if start.is_date() {
                s < to + pad && e > from - pad
            } else {
                s < to && (e > from || (e == s && s >= from))
            };
            if !overlaps {
                continue;
            }
            out.push(to_cal_event(ev, calendar_id, &start, &end));
        }
    }
    out
}

fn to_cal_event(ev: &VEvent, calendar_id: &str, start: &When, end: &When) -> CalEvent {
    let all_day = start.is_date();
    CalEvent {
        id: format!("{}::{}", ev.uid, start.match_key()),
        calendar_id: calendar_id.to_string(),
        title: ev.summary.clone(),
        start: if all_day { String::new() } else { start.to_output() },
        end: if all_day { String::new() } else { end.to_output() },
        all_day,
        start_date: all_day.then(|| start.to_output()),
        end_date: all_day.then(|| end.to_output()),
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn utc(s: &str) -> DateTime<Utc> {
        DateTime::parse_from_rfc3339(s).unwrap().with_timezone(&Utc)
    }

    fn cal(body: &str) -> String {
        format!("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n{body}END:VCALENDAR\r\n")
    }

    #[test]
    fn single_utc_event() {
        let ics = cal("BEGIN:VEVENT\r\nUID:a\r\nSUMMARY:Standup\r\nDTSTART:20260310T090000Z\r\nDTEND:20260310T093000Z\r\nEND:VEVENT\r\n");
        let evs = events_in_range(&ics, "c1", utc("2026-03-01T00:00:00Z"), utc("2026-04-01T00:00:00Z"));
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].start, "2026-03-10T09:00:00Z");
        assert_eq!(evs[0].end, "2026-03-10T09:30:00Z");
        assert_eq!(evs[0].title, "Standup");
        assert_eq!(evs[0].calendar_id, "c1");
    }

    #[test]
    fn tzid_is_converted_with_dst() {
        // Berlin is UTC+1 in winter and UTC+2 in summer.
        let ics = cal("BEGIN:VEVENT\r\nUID:b\r\nDTSTART;TZID=Europe/Berlin:20260325T100000\r\nDTEND;TZID=Europe/Berlin:20260325T110000\r\nRRULE:FREQ=WEEKLY;COUNT=2\r\nEND:VEVENT\r\n");
        let evs = events_in_range(&ics, "c", utc("2026-03-01T00:00:00Z"), utc("2026-05-01T00:00:00Z"));
        let starts: Vec<_> = evs.iter().map(|e| e.start.as_str()).collect();
        assert_eq!(starts, vec!["2026-03-25T09:00:00Z", "2026-04-01T08:00:00Z"]);
    }

    #[test]
    fn weekly_recurrence_with_exdate_and_override() {
        let ics = cal(concat!(
            "BEGIN:VEVENT\r\nUID:w\r\nSUMMARY:Weekly\r\nDTSTART:20260105T080000Z\r\nDTEND:20260105T090000Z\r\n",
            "RRULE:FREQ=WEEKLY\r\nEXDATE:20260112T080000Z\r\nEND:VEVENT\r\n",
            "BEGIN:VEVENT\r\nUID:w\r\nSUMMARY:Moved\r\nRECURRENCE-ID:20260119T080000Z\r\nDTSTART:20260120T100000Z\r\nDTEND:20260120T110000Z\r\nEND:VEVENT\r\n",
        ));
        let mut evs = events_in_range(&ics, "c", utc("2026-01-01T00:00:00Z"), utc("2026-02-01T00:00:00Z"));
        evs.sort_by(|a, b| a.start.cmp(&b.start));
        let got: Vec<_> = evs.iter().map(|e| (e.start.as_str(), e.title.as_str())).collect();
        assert_eq!(
            got,
            vec![
                ("2026-01-05T08:00:00Z", "Weekly"),
                ("2026-01-20T10:00:00Z", "Moved"),
                ("2026-01-26T08:00:00Z", "Weekly"),
            ]
        );
        // Instance ids are unique.
        let ids: HashSet<_> = evs.iter().map(|e| e.id.clone()).collect();
        assert_eq!(ids.len(), evs.len());
    }

    #[test]
    fn recurrence_started_long_ago_appears_in_range() {
        let ics = cal("BEGIN:VEVENT\r\nUID:d\r\nDTSTART:20200101T120000Z\r\nDURATION:PT45M\r\nRRULE:FREQ=DAILY\r\nEND:VEVENT\r\n");
        let evs = events_in_range(&ics, "c", utc("2026-06-01T00:00:00Z"), utc("2026-06-03T00:00:00Z"));
        let starts: Vec<_> = evs.iter().map(|e| e.start.as_str()).collect();
        assert_eq!(starts, vec!["2026-06-01T12:00:00Z", "2026-06-02T12:00:00Z"]);
        assert_eq!(evs[0].end, "2026-06-01T12:45:00Z");
    }

    #[test]
    fn all_day_event() {
        let ics = cal("BEGIN:VEVENT\r\nUID:h\r\nSUMMARY:Holiday\r\nDTSTART;VALUE=DATE:20260423\r\nDTEND;VALUE=DATE:20260425\r\nEND:VEVENT\r\n");
        let evs = events_in_range(&ics, "c", utc("2026-04-01T00:00:00Z"), utc("2026-05-01T00:00:00Z"));
        assert_eq!(evs.len(), 1);
        assert!(evs[0].all_day);
        assert_eq!(evs[0].start_date.as_deref(), Some("2026-04-23"));
        assert_eq!(evs[0].end_date.as_deref(), Some("2026-04-25"));
    }

    #[test]
    fn cancelled_and_alarm_and_folding() {
        let ics = cal(concat!(
            "BEGIN:VEVENT\r\nUID:x\r\nSUMMARY:Gone\r\nSTATUS:CANCELLED\r\nDTSTART:20260310T090000Z\r\nEND:VEVENT\r\n",
            "BEGIN:VEVENT\r\nUID:y\r\nSUMMARY:Long title\r\n  continued\\, here\r\nDTSTART:20260311T090000Z\r\n",
            "BEGIN:VALARM\r\nTRIGGER:-PT15M\r\nDESCRIPTION:Reminder\r\nSUMMARY:Alarm\r\nEND:VALARM\r\nEND:VEVENT\r\n",
        ));
        let evs = events_in_range(&ics, "c", utc("2026-03-01T00:00:00Z"), utc("2026-04-01T00:00:00Z"));
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].title, "Long title continued, here");
    }

    #[test]
    fn floating_time_stays_naive() {
        let ics = cal("BEGIN:VEVENT\r\nUID:f\r\nDTSTART:20260310T090000\r\nDTEND:20260310T100000\r\nEND:VEVENT\r\n");
        let evs = events_in_range(&ics, "c", utc("2026-03-01T00:00:00Z"), utc("2026-04-01T00:00:00Z"));
        assert_eq!(evs[0].start, "2026-03-10T09:00:00");
    }

    #[test]
    fn vendor_prefixed_tzid() {
        assert_eq!(parse_tzid("/freeassociation.sourceforge.net/Tzfile/Europe/Istanbul"), Some(chrono_tz::Europe::Istanbul));
        assert_eq!(parse_tzid("America/New_York"), Some(chrono_tz::America::New_York));
    }

    #[test]
    fn durations() {
        assert_eq!(parse_duration("PT1H30M"), Some(Duration::minutes(90)));
        assert_eq!(parse_duration("P1D"), Some(Duration::days(1)));
        assert_eq!(parse_duration("-PT15M"), Some(Duration::minutes(-15)));
        assert_eq!(parse_duration("P1W"), Some(Duration::weeks(1)));
    }
}
