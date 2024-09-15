use screenshots::Screen;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Manager};
use std::fs::{create_dir};
use std::path::Path;

fn get_current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Has time been reversed?")
        .as_secs()
}

#[tauri::command]
fn is_created_selection(app: tauri::AppHandle) -> bool {
    app.get_webview_window("selection").is_some()
}

fn create_selection_window(app: tauri::AppHandle) -> Result<String, String> {
    if !is_created_selection(app.clone()) {
        tauri::WebviewWindowBuilder::new(
            &app,
            "selection",
            tauri::WebviewUrl::App("selection/index.html".into()),
        )
            .decorations(false)
            .fullscreen(false)
            .resizable(true)
            .transparent(true)
            .always_on_top(true)
            // .visible(false)
            .build()
            .unwrap();
       return Ok("Created successfully".into());
    }
    Err("Already exists".into())
}

#[tauri::command]
fn take_screenshot(x: i32, y: i32, width: u32, height: u32) -> Result<String, String> {
    println!(
        "take_screenshot called with x: {}, y: {}, width: {}, height: {}",
        x, y, width, height
    );
    let dir_path = "pictures";
    if !Path::new(dir_path).exists() {
        create_dir(dir_path).expect("TODO: panic message");
    }
    let screens = Screen::all().map_err(|e| e.to_string())?;
    if let Some(screen) = screens.get(0) {
        let image = screen
            .capture_area(x, y, width, height)
            .map_err(|e| e.to_string())?;
        let img_path = format!("{}/{}.png", dir_path, get_current_timestamp());
        image.save(img_path).unwrap();
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
        .invoke_handler(tauri::generate_handler![
            take_screenshot,
            is_created_selection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
