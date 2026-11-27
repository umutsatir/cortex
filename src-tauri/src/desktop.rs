//! Menu bar item: shows the current / next timebox and opens Cortex.

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, Runtime};

const TRAY_ID: &str = "cortex";
const MAIN: &str = "main";

pub fn setup(app: &tauri::App) -> tauri::Result<()> {
    TrayIconBuilder::with_id(TRAY_ID)
        .icon(Image::from_bytes(include_bytes!("../icons/tray.png"))?)
        .icon_as_template(true)
        .tooltip("Cortex")
        .menu(&build_menu(app.handle(), &["Open Cortex", "Quick add…", "Quit Cortex"])?)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "quick" => {
                // Same as pressing C: the add box grows out of the sidebar.
                show_main(app);
                let _ = app.emit_to(MAIN, "open-quick-add", ());
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}

fn build_menu<R: Runtime>(app: &AppHandle<R>, labels: &[&str]) -> tauri::Result<Menu<R>> {
    let label = |i: usize, fallback: &'static str| labels.get(i).copied().unwrap_or(fallback);
    Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, "open", label(0, "Open Cortex"), true, None::<&str>)?,
            &MenuItem::with_id(app, "quick", label(1, "Quick add…"), true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "quit", label(2, "Quit Cortex"), true, None::<&str>)?,
        ],
    )
}

fn show_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window(MAIN) {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// Menu bar item: visibility, the text next to the icon and the (translated) menu labels.
#[tauri::command]
pub fn tray_update(app: AppHandle, visible: bool, title: Option<String>, labels: Vec<String>) -> Result<(), String> {
    let tray = app.tray_by_id(TRAY_ID).ok_or("tray not found")?;
    let labels: Vec<&str> = labels.iter().map(String::as_str).collect();
    tray.set_menu(Some(build_menu(&app, &labels).map_err(|e| e.to_string())?))
        .map_err(|e| e.to_string())?;
    tray.set_title(title.as_deref()).map_err(|e| e.to_string())?;
    tray.set_visible(visible).map_err(|e| e.to_string())
}
