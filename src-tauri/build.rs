use std::fs;
use std::path::Path;

fn ensure_resource(path: &str) {
    let path = Path::new(path);
    if path.exists() {
        return;
    }

    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    const PLACEHOLDER: &str = "# Placeholder binary generated during build.\n";
    if fs::write(path, PLACEHOLDER.as_bytes()).is_ok() {
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(metadata) = fs::metadata(path) {
                let mut perms = metadata.permissions();
                perms.set_mode(0o755);
                let _ = fs::set_permissions(path, perms);
            }
        }
    }
}

fn main() {
    ensure_resource("resources/bin/ffmpeg");
    ensure_resource("resources/bin/ffprobe");
    tauri_build::build()
}
