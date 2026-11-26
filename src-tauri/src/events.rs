use serde::Serialize;

/// Provider-agnostic calendar event sent to the frontend.
///
/// Timed events carry `start`/`end` as RFC 3339 strings. They are UTC (`...Z`) when the
/// source had a zone, or naive local time (no offset) for floating iCal times; the
/// frontend's `parseISO` handles both. All-day events carry `startDate`/`endDate`
/// (`YYYY-MM-DD`, end exclusive) and leave `start`/`end` empty.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalEvent {
    pub id: String,
    pub calendar_id: String,
    pub title: String,
    pub start: String,
    pub end: String,
    pub all_day: bool,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventsResult {
    pub events: Vec<CalEvent>,
    /// Per-calendar failures; the calendars that worked still return their events.
    pub errors: Vec<String>,
}

/// Errors starting with this prefix mean the stored credential is missing or rejected:
/// the frontend shows "Reconnect" instead of a generic error.
pub const AUTH_ERR: &str = "AUTH:";

pub fn auth_err(msg: &str) -> String {
    format!("{AUTH_ERR} {msg}")
}
