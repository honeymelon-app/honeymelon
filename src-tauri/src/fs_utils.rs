use std::{
    collections::{HashSet, VecDeque},
    fs,
    path::{PathBuf},
};

use crate::error::AppError;

pub fn expand_media_paths(paths: Vec<String>) -> Result<Vec<String>, AppError> {
    let mut queue: VecDeque<PathBuf> = VecDeque::new();
    let mut visited: HashSet<PathBuf> = HashSet::new();
    let mut files: Vec<PathBuf> = Vec::new();

    for path in paths {
        if path.is_empty() {
            continue;
        }
        queue.push_back(PathBuf::from(path));
    }

    while let Some(current) = queue.pop_front() {
        if !visited.insert(current.clone()) {
            continue;
        }

        match fs::metadata(&current) {
            Ok(meta) if meta.is_file() => {
                files.push(current);
            }
            Ok(meta) if meta.is_dir() => {
                if let Ok(entries) = fs::read_dir(&current) {
                    for entry in entries.flatten() {
                        queue.push_back(entry.path());
                    }
                }
            }
            Ok(_) => {}
            Err(_) => {}
        }
    }

    let mut unique = Vec::new();
    for path in files {
        if let Some(as_str) = path.to_str() {
            unique.push(as_str.to_string());
        }
    }

    Ok(unique)
}
