use std::{env, fs, os::unix::fs::PermissionsExt, path::Path, process::Command};

fn ensure_exec(path: &Path) -> std::io::Result<()> {
    // Ensure 0755 so macOS can exec under hardened runtime (ad-hoc signing is done in CI)
    let meta = fs::metadata(path)?;
    let mut perms = meta.permissions();
    perms.set_mode(0o755);
    fs::set_permissions(path, perms)
}

fn require_sidecar(rel: &str) {
    let root = env::var("CARGO_MANIFEST_DIR").unwrap(); // src-tauri/
    let p = Path::new(&root).join(rel);

    // Re-run if sidecar changes, so dev builds refresh correctly
    println!("cargo:rerun-if-changed={}", p.display());

    if !p.exists() {
        eprintln!(
            "error: required sidecar missing: {}\n\
             hint: run scripts/download-ffmpeg.sh (puts arm64 ffmpeg/ffprobe in src-tauri/bin/)",
            p.display()
        );
        // Hard fail so we never ship without sidecars
        std::process::exit(1);
    }

    // Best-effort: ensure executable bit
    let _ = ensure_exec(&p);

    // Optional: sanity print first line of `-version` in local macOS builds
    #[cfg(target_os = "macos")]
    {
        if let Ok(out) = Command::new(p.clone()).arg("-version").output() {
            if let Some(first) = String::from_utf8_lossy(&out.stdout).lines().next() {
                println!("cargo:warning={} -> {}", rel, first);
            }
        }
    }
}

fn main() {
    // Load .env (kept from your original)
    let _ = dotenvy::dotenv();

    // Forward LICENSE_PUBLIC_KEY to code
    if let Ok(key) =
        std::env::var("LICENSE_PUBLIC_KEY").or_else(|_| std::env::var("LICENSE_SIGNING_PUBLIC_KEY"))
    {
        println!("cargo:rustc-env=LICENSE_SIGNING_PUBLIC_KEY={}", key);
    }

    // New: enforce the *new* paths
    require_sidecar("bin/ffmpeg");
    require_sidecar("bin/ffprobe");

    tauri_build::build();
}
