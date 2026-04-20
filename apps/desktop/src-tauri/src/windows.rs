use std::path::PathBuf;
use tauri::utils::config::WindowConfig;
use tauri::{
    AppHandle, DragDropEvent, Emitter, LogicalSize, Manager, Size, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};
use uuid::Uuid;

const MIN_EDITOR_WINDOW_WIDTH: f64 = 960.0;
const MIN_EDITOR_WINDOW_HEIGHT: f64 = 720.0;
const NEW_WINDOW_PREFERRED_WIDTH: f64 = 1100.0;
const NEW_WINDOW_PREFERRED_HEIGHT: f64 = 760.0;
const NEW_WINDOW_MAX_WORK_AREA_RATIO: f64 = 0.85;

pub fn create_editor_window(app: &AppHandle) -> Result<String, String> {
    let mut config = app
        .config()
        .app
        .windows
        .first()
        .cloned()
        .ok_or_else(|| "기본 창 설정을 찾을 수 없습니다".to_string())?;

    let label = format!("main{}", Uuid::new_v4().simple());
    config.label = label.clone();
    config.title = "HOP".to_string();
    config.url = WebviewUrl::App("index.html".into());
    config.x = None;
    config.y = None;
    config.center = true;
    apply_new_window_size(app, &mut config);

    let window = WebviewWindowBuilder::from_config(app, &config)
        .map_err(|e| format!("새 창 설정 실패: {}", e))?
        .build()
        .map_err(|e| format!("새 창 생성 실패: {}", e))?;
    install_editor_window_size_guard(&window);
    attach_document_drop_handler(app, &window);
    let _ = window.set_focus();

    Ok(label)
}

fn apply_new_window_size(app: &AppHandle, config: &mut WindowConfig) {
    let (max_width, max_height) = active_monitor_logical_work_area(app)
        .map(|(width, height)| {
            (
                (width * NEW_WINDOW_MAX_WORK_AREA_RATIO).floor(),
                (height * NEW_WINDOW_MAX_WORK_AREA_RATIO).floor(),
            )
        })
        .unwrap_or((config.width, config.height));

    let min_width = config.min_width.unwrap_or(MIN_EDITOR_WINDOW_WIDTH);
    let min_height = config.min_height.unwrap_or(MIN_EDITOR_WINDOW_HEIGHT);

    config.min_width = Some(min_width);
    config.min_height = Some(min_height);
    config.width = clamped_new_window_dimension(NEW_WINDOW_PREFERRED_WIDTH, min_width, max_width);
    config.height =
        clamped_new_window_dimension(NEW_WINDOW_PREFERRED_HEIGHT, min_height, max_height);
}

fn active_monitor_logical_work_area(app: &AppHandle) -> Option<(f64, f64)> {
    let monitor = target_window_label(app)
        .and_then(|label| app.get_webview_window(&label))
        .and_then(|window| window.current_monitor().ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten())?;
    let scale_factor = monitor.scale_factor();
    if scale_factor <= 0.0 {
        return None;
    }
    let work_area = monitor.work_area();
    Some((
        f64::from(work_area.size.width) / scale_factor,
        f64::from(work_area.size.height) / scale_factor,
    ))
}

fn clamped_new_window_dimension(preferred: f64, min: f64, max: f64) -> f64 {
    if max <= 0.0 {
        return preferred.max(min);
    }
    preferred.min(max).max(min)
}

pub fn install_editor_window_size_guard(window: &WebviewWindow) {
    enforce_editor_window_minimum(window);

    let guarded_window = window.clone();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Resized(_)) {
            enforce_editor_window_minimum(&guarded_window);
        }
    });
}

fn enforce_editor_window_minimum(window: &WebviewWindow) {
    let minimum = LogicalSize::new(MIN_EDITOR_WINDOW_WIDTH, MIN_EDITOR_WINDOW_HEIGHT);
    let _ = window.set_min_size(Some(Size::Logical(minimum)));

    let Ok(scale_factor) = window.scale_factor() else {
        return;
    };
    if scale_factor <= 0.0 {
        return;
    }

    let Ok(inner_size) = window.inner_size() else {
        return;
    };
    let logical_size = inner_size.to_logical::<f64>(scale_factor);
    if logical_size.width >= MIN_EDITOR_WINDOW_WIDTH
        && logical_size.height >= MIN_EDITOR_WINDOW_HEIGHT
    {
        return;
    }

    let width = logical_size.width.max(MIN_EDITOR_WINDOW_WIDTH);
    let height = logical_size.height.max(MIN_EDITOR_WINDOW_HEIGHT);
    let _ = window.set_size(Size::Logical(LogicalSize::new(width, height)));
}

pub fn attach_document_drop_handler(app: &AppHandle, window: &WebviewWindow) {
    let app = app.clone();
    let label = window.label().to_string();
    window.on_window_event(move |event| {
        let WindowEvent::DragDrop(DragDropEvent::Drop { paths, .. }) = event else {
            return;
        };
        let paths = document_paths(paths);
        if paths.is_empty() {
            return;
        }
        let _ = app.emit_to(
            label.as_str(),
            "hop-open-paths",
            serde_json::json!({ "paths": paths }),
        );
    });
}

fn document_paths(paths: &[PathBuf]) -> Vec<String> {
    paths
        .iter()
        .filter(|path| {
            path.extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.eq_ignore_ascii_case("hwp") || ext.eq_ignore_ascii_case("hwpx"))
                .unwrap_or(false)
        })
        .map(|path| path.to_string_lossy().to_string())
        .collect()
}

pub fn target_window_label(app: &AppHandle) -> Option<String> {
    let windows = app.webview_windows();
    windows
        .iter()
        .find(|(_, window)| window.is_focused().unwrap_or(false))
        .map(|(label, _)| label.clone())
        .or_else(|| windows.keys().next().cloned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn document_paths_keeps_only_supported_documents() {
        let a = PathBuf::from("/tmp/a.hwp");
        let b = PathBuf::from("/tmp/b.HWPX");
        let paths = document_paths(&[
            a.clone(),
            b.clone(),
            PathBuf::from("/tmp/c.pdf"),
            PathBuf::from("/tmp/no-extension"),
        ]);

        assert_eq!(
            paths,
            vec![
                a.to_string_lossy().to_string(),
                b.to_string_lossy().to_string()
            ]
        );
    }

    #[test]
    fn document_paths_preserves_input_order() {
        let first = PathBuf::from("/tmp/first.hwp");
        let second = PathBuf::from("/tmp/second.hwpx");
        let paths = document_paths(&[first.clone(), second.clone()]);

        assert_eq!(
            paths,
            vec![
                first.to_string_lossy().to_string(),
                second.to_string_lossy().to_string()
            ]
        );
    }

    #[test]
    fn clamped_new_window_dimension_prefers_default_within_work_area() {
        assert_eq!(clamped_new_window_dimension(1100.0, 960.0, 1400.0), 1100.0);
    }

    #[test]
    fn clamped_new_window_dimension_caps_to_work_area() {
        assert_eq!(clamped_new_window_dimension(1100.0, 960.0, 1000.0), 1000.0);
    }

    #[test]
    fn clamped_new_window_dimension_keeps_minimum_on_small_screens() {
        assert_eq!(clamped_new_window_dimension(1100.0, 720.0, 578.0), 720.0);
    }
}
