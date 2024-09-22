use base64::{engine::general_purpose, Engine as _};
use lazy_static::lazy_static;
use screenshots::image::codecs::png::PngEncoder;
use screenshots::image::{ColorType, ImageBuffer, Rgba};
use screenshots::Screen;
use std::sync::{Arc, Mutex};
use serde::Deserialize;
use tauri::Manager;

#[cfg(desktop)]
mod tray;

// 缓存屏幕对象的全局变量
lazy_static! {
    static ref SCREEN_CACHE: Arc<Mutex<Option<Screen>>> = Arc::new(Mutex::new(None));
}

#[derive(PartialEq, Deserialize)]
enum ActionType {
    Init,
    Save,
    Fasten,
    Copy
}

#[tauri::command]
fn is_created_selection(app: tauri::AppHandle) -> bool {
    app.get_webview_window("selection").is_some()
}

#[tauri::command]
fn close_selection_app(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("selection") {
        let _ = window.close();
    }
}

// 更新或获取屏幕对象，根据 ActionType 的不同行为决定是否强制更新缓存
fn get_or_cache_screen(action_type: &ActionType) -> Result<Screen, String> {
    let mut cache = SCREEN_CACHE.lock().unwrap();

    // 当 ActionType 为 Init 时，无论缓存是否存在，都强制更新缓存
    if action_type == &ActionType::Init || cache.is_none() {
        println!("更新");
        let screens = Screen::all().map_err(|e| e.to_string())?;
        let screen = screens.get(0).ok_or("Screen not found")?;
        *cache = Some(screen.clone()); // 更新缓存
        return Ok(screen.clone());
    }

    // 如果不是 Init 且缓存存在，直接返回缓存中的屏幕对象
    if let Some(ref screen) = *cache {
        println!("缓存");
        return Ok(screen.clone());
    }

    Err("Failed to get screen".to_string())
}

// 执行截图操作
fn capture_screenshot(x: i32, y: i32, width: u32, height: u32, action_type: &ActionType) -> Result<Vec<u8>, String> {
    let screen = get_or_cache_screen(action_type)?; // 获取或缓存的 screen 对象

    let image = screen
        .capture_area(x, y, width, height)
        .map_err(|e| e.to_string())?;

    let buffer: ImageBuffer<Rgba<u8>, _> =
        ImageBuffer::from_raw(width, height, image).ok_or("Failed to create image buffer")?;

    let mut png_data = Vec::new();
    let encoder = PngEncoder::new(&mut png_data);
    encoder
        .encode(&buffer, width, height, ColorType::Rgba8)
        .map_err(|e| e.to_string())?;

    Ok(png_data)
}

#[tauri::command]
fn take_screenshot(
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    action_type: ActionType,
    file_path: Option<String>,
) -> Result<String, String> {
    // 根据传入的坐标和尺寸截图
    let screenshot_data = capture_screenshot(x, y, width, height, &action_type)?;

    if action_type == ActionType::Save {
        let path = file_path.unwrap();
        std::fs::write(&path, &screenshot_data).map_err(|e| e.to_string())?;
        Ok(format!("The screenshot has been saved to: {}", path))
    } else if action_type == ActionType::Init || action_type == ActionType::Fasten {
        let base64_image = general_purpose::STANDARD.encode(screenshot_data);
        Ok(format!("data:image/png;base64,{}", base64_image))
    } else {
        Err("Invalid action type".to_string())
    }
}

#[tauri::command]
fn copy_screenshot(x: i32, y: i32, width: u32, height: u32) -> Result<Vec<u8>, String> {
    // 使用 Fasten 类型获取截图，不更新 screen
    let screenshot_data = capture_screenshot(x, y, width, height, &ActionType::Copy)?;
    Ok(screenshot_data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(all(desktop))]
            {
                let handle = app.handle();
                tray::create_tray(handle)?;
            }
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            close_selection_app,
            take_screenshot,
            copy_screenshot,
            is_created_selection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
