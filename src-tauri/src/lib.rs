use screenshots::Screen;
use tauri::Manager;

#[tauri::command]
fn is_created_selection(app: tauri::AppHandle) -> bool {
    app.get_webview_window("selection").is_some()
}

#[tauri::command]
fn take_screenshot(
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    file_path: String,
) -> Result<String, String> {
    println!(
        "take_screenshot called with x: {}, y: {}, width: {}, height: {}",
        x, y, width, height
    );
    let screens = Screen::all().map_err(|e| e.to_string())?;
    if let Some(screen) = screens.get(0) {
        let image = screen
            .capture_area(x, y, width, height)
            .map_err(|e| e.to_string())?;
        image.save(file_path).unwrap();
        Ok("Screenshot successful".into())
    } else {
        Err("Screen not found".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            take_screenshot,
            is_created_selection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
