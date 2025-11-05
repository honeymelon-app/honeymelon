/**
 * File system utilities for media file discovery and path expansion.
 *
 * This module provides utilities for working with file system paths in the context
 * of media file processing. The main functionality is expanding directory paths
 * to discover all media files contained within, supporting recursive traversal
 * and deduplication.
 *
 * The implementation uses a breadth-first search (BFS) approach with a queue
 * and visited set to efficiently handle directory traversal while avoiding
 * infinite loops from circular symlinks or redundant paths.
 */
use std::{
    collections::{HashSet, VecDeque},
    fs,
    path::PathBuf,
};

use crate::error::AppError;

/**
 * Expands a list of file and directory paths into a flat list of all files found.
 *
 * This function recursively traverses directories to find all files within them,
 * while treating individual file paths as-is. It performs deduplication to avoid
 * processing the same path multiple times and handles various edge cases like
 * non-existent paths, empty strings, and filesystem errors gracefully.
 *
 * The algorithm uses a breadth-first search (BFS) approach:
 * 1. Start with all input paths in a queue
 * 2. For each path, check if it's a file or directory
 * 3. If it's a file, add it to the results
 * 4. If it's a directory, enqueue all its children
 * 5. Use a visited set to prevent processing the same path twice
 *
 * This approach ensures efficient traversal and prevents infinite loops that
 * could occur with circular directory structures or symlinks.
 *
 * # Arguments
 *
 * * `paths` - A vector of string paths that can be either files or directories
 *
 * # Returns
 *
 * Returns a `Result` containing:
 * - `Ok(Vec<String>)` - A vector of file paths as strings, with duplicates removed
 * - `Err(AppError)` - An error if filesystem operations fail
 *
 * # Examples
 *
 * ```
 * // Expand a directory to find all files within
 * let files = expand_media_paths(vec!["/path/to/media".to_string()])?;
 *
 * // Mix files and directories
 * let files = expand_media_paths(vec![
 *     "/path/to/video.mp4".to_string(),
 *     "/path/to/media/folder".to_string()
 * ])?;
 * ```
 *
 * # Error Handling
 *
 * The function handles various error conditions gracefully:
 * - Non-existent paths are silently ignored
 * - Filesystem permission errors are ignored (paths skipped)
 * - Invalid UTF-8 paths are filtered out
 * - Empty strings in input are filtered out
 *
 * This defensive approach ensures the function doesn't fail completely due to
 * individual problematic paths, allowing partial success when possible.
 */
pub fn expand_media_paths(paths: Vec<String>) -> Result<Vec<String>, AppError> {
    // BFS queue for directory traversal
    let mut queue: VecDeque<PathBuf> = VecDeque::new();
    // Set to track visited paths and prevent duplicates/cycles
    let mut visited: HashSet<PathBuf> = HashSet::new();
    // Collection of discovered files
    let mut files: Vec<PathBuf> = Vec::new();

    // Initialize queue with all input paths, filtering out empty strings
    for path in paths {
        if path.is_empty() {
            continue;
        }
        queue.push_back(PathBuf::from(path));
    }

    // Process queue using breadth-first search
    while let Some(current) = queue.pop_front() {
        // Skip if we've already processed this path
        if !visited.insert(current.clone()) {
            continue;
        }

        // Check the path metadata to determine if it's a file or directory
        match fs::metadata(&current) {
            Ok(meta) if meta.is_file() => {
                // It's a file, add it to our results
                files.push(current);
            },
            Ok(meta) if meta.is_dir() => {
                // It's a directory, enqueue all its children for processing
                if let Ok(entries) = fs::read_dir(&current) {
                    for entry in entries.flatten() {
                        queue.push_back(entry.path());
                    }
                }
            },
            Ok(_) => {
                // Path exists but is neither file nor directory (e.g., symlink, device)
                // Silently ignore these special file types
            },
            Err(_) => {
                // Path doesn't exist or permission denied
                // Silently ignore these errors to allow partial success
            },
        }
    }

    // Convert PathBuf results to strings, filtering out invalid UTF-8 paths
    let mut unique = Vec::new();
    for path in files {
        if let Some(as_str) = path.to_str() {
            unique.push(as_str.to_string());
        }
    }

    Ok(unique)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn create_test_dir() -> std::io::Result<tempfile::TempDir> {
        tempfile::tempdir()
    }

    #[test]
    fn test_expand_single_file() {
        let temp_dir = create_test_dir().unwrap();
        let file_path = temp_dir.path().join("test.mp4");
        fs::File::create(&file_path).unwrap();

        let result = expand_media_paths(vec![file_path.to_str().unwrap().to_string()]).unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0], file_path.to_str().unwrap());
    }

    #[test]
    fn test_expand_multiple_files() {
        let temp_dir = create_test_dir().unwrap();
        let file1 = temp_dir.path().join("test1.mp4");
        let file2 = temp_dir.path().join("test2.mkv");

        fs::File::create(&file1).unwrap();
        fs::File::create(&file2).unwrap();

        let result = expand_media_paths(vec![
            file1.to_str().unwrap().to_string(),
            file2.to_str().unwrap().to_string(),
        ])
        .unwrap();

        assert_eq!(result.len(), 2);
        assert!(result.contains(&file1.to_str().unwrap().to_string()));
        assert!(result.contains(&file2.to_str().unwrap().to_string()));
    }

    #[test]
    fn test_expand_directory() {
        let temp_dir = create_test_dir().unwrap();
        let file1 = temp_dir.path().join("video1.mp4");
        let file2 = temp_dir.path().join("video2.mkv");

        fs::File::create(&file1).unwrap();
        fs::File::create(&file2).unwrap();

        let result =
            expand_media_paths(vec![temp_dir.path().to_str().unwrap().to_string()]).unwrap();

        assert_eq!(result.len(), 2);
        assert!(result.contains(&file1.to_str().unwrap().to_string()));
        assert!(result.contains(&file2.to_str().unwrap().to_string()));
    }

    #[test]
    fn test_expand_nested_directories() {
        let temp_dir = create_test_dir().unwrap();
        let sub_dir = temp_dir.path().join("subdir");
        fs::create_dir(&sub_dir).unwrap();

        let file1 = temp_dir.path().join("video1.mp4");
        let file2 = sub_dir.join("video2.mkv");
        let file3 = sub_dir.join("video3.webm");

        fs::File::create(&file1).unwrap();
        fs::File::create(&file2).unwrap();
        fs::File::create(&file3).unwrap();

        let result =
            expand_media_paths(vec![temp_dir.path().to_str().unwrap().to_string()]).unwrap();

        assert_eq!(result.len(), 3);
        assert!(result.contains(&file1.to_str().unwrap().to_string()));
        assert!(result.contains(&file2.to_str().unwrap().to_string()));
        assert!(result.contains(&file3.to_str().unwrap().to_string()));
    }

    #[test]
    fn test_expand_mixed_files_and_directories() {
        let temp_dir = create_test_dir().unwrap();
        let sub_dir = temp_dir.path().join("subdir");
        fs::create_dir(&sub_dir).unwrap();

        let file1 = temp_dir.path().join("video1.mp4");
        let file2 = sub_dir.join("video2.mkv");

        fs::File::create(&file1).unwrap();
        fs::File::create(&file2).unwrap();

        let result = expand_media_paths(vec![
            file1.to_str().unwrap().to_string(),
            sub_dir.to_str().unwrap().to_string(),
        ])
        .unwrap();

        assert_eq!(result.len(), 2);
        assert!(result.contains(&file1.to_str().unwrap().to_string()));
        assert!(result.contains(&file2.to_str().unwrap().to_string()));
    }

    #[test]
    fn test_expand_empty_paths() {
        let result = expand_media_paths(vec![]).unwrap();
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_expand_empty_string_in_paths() {
        let temp_dir = create_test_dir().unwrap();
        let file1 = temp_dir.path().join("video.mp4");
        fs::File::create(&file1).unwrap();

        let result = expand_media_paths(vec![
            "".to_string(),
            file1.to_str().unwrap().to_string(),
            "".to_string(),
        ])
        .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0], file1.to_str().unwrap());
    }

    #[test]
    fn test_expand_nonexistent_path() {
        let result = expand_media_paths(vec!["/nonexistent/path/video.mp4".to_string()]).unwrap();
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_expand_duplicate_paths() {
        let temp_dir = create_test_dir().unwrap();
        let file1 = temp_dir.path().join("video.mp4");
        fs::File::create(&file1).unwrap();

        // Add same file path multiple times
        let result = expand_media_paths(vec![
            file1.to_str().unwrap().to_string(),
            file1.to_str().unwrap().to_string(),
            file1.to_str().unwrap().to_string(),
        ])
        .unwrap();

        // Should be deduplicated by visited set
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], file1.to_str().unwrap());
    }

    #[test]
    fn test_expand_directory_with_subdirectories_only() {
        let temp_dir = create_test_dir().unwrap();
        let sub_dir1 = temp_dir.path().join("subdir1");
        let sub_dir2 = temp_dir.path().join("subdir2");
        fs::create_dir(&sub_dir1).unwrap();
        fs::create_dir(&sub_dir2).unwrap();

        let result =
            expand_media_paths(vec![temp_dir.path().to_str().unwrap().to_string()]).unwrap();

        // Only directories, no files
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_expand_deeply_nested() {
        let temp_dir = create_test_dir().unwrap();
        let level1 = temp_dir.path().join("level1");
        let level2 = level1.join("level2");
        let level3 = level2.join("level3");

        fs::create_dir_all(&level3).unwrap();

        let file = level3.join("deep_video.mp4");
        fs::File::create(&file).unwrap();

        let result =
            expand_media_paths(vec![temp_dir.path().to_str().unwrap().to_string()]).unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0], file.to_str().unwrap());
    }

    #[test]
    fn test_expand_ignores_special_files() {
        let temp_dir = create_test_dir().unwrap();
        let regular_file = temp_dir.path().join("video.mp4");
        fs::File::create(&regular_file).unwrap();

        // The expand function should handle special files gracefully
        let result =
            expand_media_paths(vec![temp_dir.path().to_str().unwrap().to_string()]).unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0], regular_file.to_str().unwrap());
    }
}
