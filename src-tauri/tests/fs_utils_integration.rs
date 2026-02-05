// Copyright (C) 2025-2026 Jerome Thayananthajothy
//
// This file is part of Honeymelon.
//
// Honeymelon is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/\>.

use honeymelon_lib::expand_media_paths;
use std::fs;
use tempfile::TempDir;

#[test]
fn expand_media_paths_discovers_files_recursively() {
    let temp = TempDir::new().expect("temp dir");
    let nested = temp.path().join("nested");
    fs::create_dir(&nested).expect("nested dir");

    let files = [
        temp.path().join("video1.mp4"),
        nested.join("audio1.m4a"),
        nested.join("image.png"),
    ];

    for file in &files {
        fs::File::create(file).expect("touch file");
    }

    let inputs = vec![temp.path().to_string_lossy().to_string()];
    let expanded = expand_media_paths(inputs).expect("expand paths");

    assert_eq!(expanded.len(), 3);
    for file in &files {
        assert!(
            expanded.iter().any(|entry| entry == file.to_str().unwrap()),
            "expected {} to be discovered",
            file.display()
        );
    }
}

#[test]
fn expand_media_paths_skips_duplicates_and_invalid_entries() {
    let temp = TempDir::new().expect("temp dir");
    let file = temp.path().join("video2.mkv");
    fs::File::create(&file).expect("touch file");

    let inputs = vec![
        "".to_string(), // invalid entry should be ignored
        file.to_string_lossy().to_string(),
        file.to_string_lossy().to_string(), // duplicate
    ];

    let expanded = expand_media_paths(inputs).expect("expand paths");
    assert_eq!(expanded.len(), 1);
    assert_eq!(expanded[0], file.to_string_lossy());
}
