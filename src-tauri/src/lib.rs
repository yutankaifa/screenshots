use screenshots::{Screen,image::ImageOutputFormat};
use tauri::Manager;
use base64::{engine::general_purpose, Engine as _};
use std::io::Cursor;

#[cfg(desktop)]
mod tray;
#[tauri::command]
fn is_created_selection(app: tauri::AppHandle) -> bool {
    app.get_webview_window("selection").is_some()
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
    let screen = screens.get(0).ok_or("没有找到屏幕")?;
    let x = x.unwrap_or(0);
    let y = y.unwrap_or(0);
    let width = width.unwrap_or(screen.display_info.width);
    let height = height.unwrap_or(screen.display_info.height);
    println!(
        "take_screenshot called with x: {}, y: {}, width: {}, height: {}",
        x, y, width, height
    );
    if let Some(screen) = screens.get(0) {
        let image = screen
            .capture_area(x, y, width, height)
            .map_err(|e| e.to_string())?;
        if let Some(path) = file_path {
            image.save(&path).map_err(|e| e.to_string())?;
            Ok(format!("截图已保存到: {}", path))
        } else {
            let mut buffer = Cursor::new(Vec::new());
            image.write_to(&mut buffer, ImageOutputFormat::Png)
                .map_err(|e| e.to_string())?;
            let base64_image = general_purpose::STANDARD.encode(buffer.into_inner());
            Ok(format!("data:image/png;base64,{}", base64_image))
        }
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
        .setup(|app| {
            #[cfg(all(desktop))]
            {
                let handle = app.handle();
                tray::create_tray(handle)?;
            }
            Ok(())
        })
        .on_window_event(|window,event| match event  {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            take_screenshot,
            is_created_selection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
