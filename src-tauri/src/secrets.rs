//! Credentials live in the macOS Keychain, never in the webview's localStorage.

use keyring::{Entry, Error};

const SERVICE: &str = "com.umut.cortex";

fn entry(account_id: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, account_id).map_err(|e| e.to_string())
}

pub fn set(account_id: &str, secret: &str) -> Result<(), String> {
    entry(account_id)?.set_password(secret).map_err(|e| e.to_string())
}

/// `Ok(None)` when nothing is stored for this account.
pub fn get(account_id: &str) -> Result<Option<String>, String> {
    match entry(account_id)?.get_password() {
        Ok(s) => Ok(Some(s)),
        Err(Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn delete(account_id: &str) -> Result<(), String> {
    match entry(account_id)?.delete_credential() {
        Ok(()) | Err(Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
