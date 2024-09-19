use base64::{engine::general_purpose, Engine as _};
use screenshots::{image::{ImageOutputFormat}, Screen};
use std::io::Cursor;
use screenshots::image::{ColorType, ImageBuffer, Rgba};
use screenshots::image::codecs::png::PngEncoder;
use tauri::Manager;

#[cfg(desktop)]
mod tray;
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
#[tauri::command]
fn take_screenshot(
    x: Option<i32>,
    y: Option<i32>,
    width: Option<u32>,
    height: Option<u32>,
    file_path: Option<String>,
) -> Result<String, String> {
    let screens = Screen::all().map_err(|e| e.to_string())?;
    let screen = screens.get(0).ok_or("Screen not found")?;
    let x = x.unwrap_or(0);
    let y = y.unwrap_or(0);
    let width = width.unwrap_or(screen.display_info.width);
    let height = height.unwrap_or(screen.display_info.height);
    println!(
        "take_screenshot called with x: {}, y: {}, width: {}, height: {}",
        x, y, width, height
    );
    let image = screen
        .capture_area(x, y, width, height)
        .map_err(|e| e.to_string())?;
    if let Some(path) = file_path {
        image.save(&path).map_err(|e| e.to_string())?;
        Ok(format!("The screenshot has been saved to: {}", path))
    } else {
        let mut buffer = Cursor::new(Vec::new());
        image
            .write_to(&mut buffer, ImageOutputFormat::Png)
            .map_err(|e| e.to_string())?;
        let base64_image = general_purpose::STANDARD.encode(buffer.into_inner());
        Ok(format!("data:image/png;base64,{}", base64_image))
    }
}
#[tauri::command]
fn copy_screenshot(
    x: Option<i32>,
    y: Option<i32>,
    width: Option<u32>,
    height: Option<u32>,
) -> Result<Vec<u8>, String> {
    let screens = Screen::all().map_err(|e| e.to_string())?;
    let screen = screens.get(0).ok_or("Screen not found")?;
    let x = x.unwrap_or(0);
    let y = y.unwrap_or(0);
    let width = width.unwrap_or(screen.display_info.width);
    let height = height.unwrap_or(screen.display_info.height);
    // Capture the screen area
    let image = screen
        .capture_area(x, y, width, height)
        .map_err(|e| e.to_string())?;
    // Convert the image to ImageBuffer for encoding
    let buffer: ImageBuffer<Rgba<u8>, _> = ImageBuffer::from_raw(width, height, image).ok_or("Failed to create image buffer")?;
    // Encode the image as PNG
    let mut png_data = Vec::new();
    let encoder = PngEncoder::new(&mut png_data);
    encoder
        .encode(&buffer, width, height, ColorType::Rgba8)
        .map_err(|e| e.to_string())?;
    Ok(png_data)
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
