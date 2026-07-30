#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app = tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      use tauri_plugin_shell::ShellExt;
      use std::sync::{Arc, Mutex};
      use tauri::Manager;
      
      let current_dir = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
      
      let shell = app.handle().shell();
      let sidecar_command = shell.sidecar("server")
          .expect("failed to create sidecar command")
          .current_dir(current_dir);
      
      let (_rx, child) = sidecar_command
          .spawn()
          .expect("Failed to spawn sidecar");

      let child_arc = Arc::new(Mutex::new(Some(child)));
      app.manage(child_arc); // Store it in Tauri's state manager
      
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while running tauri application");

  app.run(|app_handle, event| {
    if let tauri::RunEvent::Exit = event {
      use tauri::Manager;
      if let Some(child_arc) = app_handle.try_state::<std::sync::Arc<std::sync::Mutex<Option<tauri_plugin_shell::process::CommandChild>>>>() {
          if let Ok(mut child_opt) = child_arc.lock() {
              if let Some(child) = child_opt.take() {
                  let _ = child.kill();
              }
          }
      }
    }
  });
}
