mod caldav;
#[cfg(desktop)]
mod desktop;
mod events;
mod google;
mod ical;
mod secrets;

/// Removes whatever credential is stored for an integration account.
#[tauri::command]
fn integration_forget(account_id: String) -> Result<(), String> {
    secrets::delete(&account_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .manage(google::TokenCache::default())
        .setup(|app| {
            use tauri::Manager;
            secrets::init(app.path().app_data_dir()?);
            #[cfg(desktop)]
            desktop::setup(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            integration_forget,
            caldav::caldav_connect,
            caldav::caldav_list_calendars,
            caldav::caldav_migrate_secret,
            caldav::caldav_get_events,
            google::google_is_configured,
            google::google_connect,
            google::google_cancel_connect,
            google::google_list_calendars,
            google::google_get_events,
            google::google_disconnect,
            desktop::tray_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
