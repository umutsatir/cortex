//! Calendar credentials (iCloud app-specific passwords, Google refresh tokens).
//!
//! They live in `secrets.json` in the app's data directory, readable only by the
//! user (0600), next to the SQLite database — never in the webview's localStorage.
//!
//! Why not the macOS Keychain: a Keychain item's access list is bound to the code
//! signature of the app that created it. Cortex is not signed with a Developer ID,
//! so every update looks like a different app and macOS asks for the login
//! password once per stored account. Revisit once builds are Developer ID signed.

use std::collections::BTreeMap;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

static PATH: OnceLock<PathBuf> = OnceLock::new();
static LOCK: Mutex<()> = Mutex::new(());

/// Called once at startup with the app data directory.
pub fn init(dir: PathBuf) {
    let _ = PATH.set(dir.join("secrets.json"));
}

fn path() -> Result<&'static PathBuf, String> {
    PATH.get().ok_or_else(|| "Secret store is not initialised".to_string())
}

fn load() -> Result<BTreeMap<String, String>, String> {
    match fs::read_to_string(path()?) {
        Ok(s) if s.trim().is_empty() => Ok(BTreeMap::new()),
        Ok(s) => serde_json::from_str(&s).map_err(|e| format!("Secret store is unreadable: {e}")),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(BTreeMap::new()),
        Err(e) => Err(e.to_string()),
    }
}

/// Writes atomically (temp file + rename) with owner-only permissions.
fn save(map: &BTreeMap<String, String>) -> Result<(), String> {
    let path = path()?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("json.tmp");
    let json = serde_json::to_vec_pretty(map).map_err(|e| e.to_string())?;
    {
        let mut opts = fs::OpenOptions::new();
        opts.write(true).create(true).truncate(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            opts.mode(0o600);
        }
        let mut f = opts.open(&tmp).map_err(|e| e.to_string())?;
        f.write_all(&json).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}

pub fn set(account_id: &str, secret: &str) -> Result<(), String> {
    let _g = LOCK.lock().map_err(|e| e.to_string())?;
    let mut map = load()?;
    map.insert(account_id.to_string(), secret.to_string());
    save(&map)
}

/// `Ok(None)` when nothing is stored for this account.
pub fn get(account_id: &str) -> Result<Option<String>, String> {
    let _g = LOCK.lock().map_err(|e| e.to_string())?;
    Ok(load()?.get(account_id).cloned())
}

pub fn delete(account_id: &str) -> Result<(), String> {
    let _g = LOCK.lock().map_err(|e| e.to_string())?;
    let mut map = load()?;
    if map.remove(account_id).is_some() {
        save(&map)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_and_permissions() {
        let dir = std::env::temp_dir().join(format!("cortex-secrets-{}", std::process::id()));
        init(dir.clone());
        assert_eq!(get("apple:a@b.c").unwrap(), None);
        set("apple:a@b.c", "pw1").unwrap();
        set("google:x@y.z", "tok").unwrap();
        assert_eq!(get("apple:a@b.c").unwrap().as_deref(), Some("pw1"));
        delete("apple:a@b.c").unwrap();
        assert_eq!(get("apple:a@b.c").unwrap(), None);
        assert_eq!(get("google:x@y.z").unwrap().as_deref(), Some("tok"));
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = fs::metadata(dir.join("secrets.json")).unwrap().permissions().mode();
            assert_eq!(mode & 0o777, 0o600);
        }
        let _ = fs::remove_dir_all(dir);
    }
}
