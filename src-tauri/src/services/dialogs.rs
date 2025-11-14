use crate::error::AppError;

const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "m4v", "mov", "mkv", "webm", "avi", "mpg", "mpeg", "ts", "m2ts", "mxf", "hevc", "h265",
    "h264", "flv", "ogv", "wmv", "gif",
];
const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "aac", "m4a", "flac", "wav", "aiff", "aif", "ogg", "opus", "wma", "alac", "wave",
];
const IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp"];
const ALL_MEDIA_EXTENSIONS: &[&str] = &[
    "mp4", "m4v", "mov", "mkv", "webm", "avi", "mpg", "mpeg", "ts", "m2ts", "mxf", "hevc", "h265",
    "h264", "flv", "ogv", "wmv", "gif", "mp3", "aac", "m4a", "flac", "wav", "aiff", "aif", "ogg",
    "opus", "wma", "alac", "wave", "png", "jpg", "jpeg", "webp",
];

/// Dialog filter categories for file pickers.
#[derive(Clone, Copy)]
pub enum MediaFilter {
    Video,
    Audio,
    Image,
    All,
}

impl MediaFilter {
    pub fn from_kind(input: Option<&str>) -> Self {
        match input {
            Some("video") => Self::Video,
            Some("audio") => Self::Audio,
            Some("image") => Self::Image,
            _ => Self::All,
        }
    }

    fn extensions(&self) -> &'static [&'static str] {
        match self {
            MediaFilter::Video => VIDEO_EXTENSIONS,
            MediaFilter::Audio => AUDIO_EXTENSIONS,
            MediaFilter::Image => IMAGE_EXTENSIONS,
            MediaFilter::All => ALL_MEDIA_EXTENSIONS,
        }
    }

    fn label(&self) -> &'static str {
        match self {
            MediaFilter::Video => "Video Files",
            MediaFilter::Audio => "Audio Files",
            MediaFilter::Image => "Image Files",
            MediaFilter::All => "Media Files",
        }
    }
}

pub trait DialogServiceApi: Send + Sync {
    fn pick_media_files(&self, filter: MediaFilter) -> Result<Vec<String>, AppError>;
    fn choose_output_directory(
        &self,
        default_path: Option<String>,
    ) -> Result<Option<String>, AppError>;
}

/// Service for handling modal dialogs (file/folder pickers).
#[derive(Clone, Default)]
pub struct DialogService;

impl DialogServiceApi for DialogService {
    fn pick_media_files(&self, filter: MediaFilter) -> Result<Vec<String>, AppError> {
        let selection = rfd::FileDialog::new()
            .set_title("Choose media files")
            .add_filter(filter.label(), filter.extensions())
            .pick_files();

        let Some(paths) = selection else {
            return Ok(Vec::new());
        };

        let files = paths
            .into_iter()
            .filter_map(|path| path.to_str().map(|value| value.to_string()))
            .collect();

        Ok(files)
    }

    fn choose_output_directory(
        &self,
        default_path: Option<String>,
    ) -> Result<Option<String>, AppError> {
        let selection = {
            let mut dialog = rfd::FileDialog::new().set_title("Select output folder");
            if let Some(path) = &default_path {
                dialog = dialog.set_directory(path);
            }
            dialog.pick_folder()
        };

        let Some(path) = selection else {
            return Ok(None);
        };

        Ok(path.to_str().map(|value| value.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn media_filter_from_kind_matches_expected_variants() {
        assert!(matches!(
            MediaFilter::from_kind(Some("video")),
            MediaFilter::Video
        ));
        assert!(matches!(
            MediaFilter::from_kind(Some("audio")),
            MediaFilter::Audio
        ));
        assert!(matches!(
            MediaFilter::from_kind(Some("image")),
            MediaFilter::Image
        ));
        assert!(matches!(MediaFilter::from_kind(None), MediaFilter::All));
    }

    #[test]
    fn media_filter_exposes_sensible_labels_and_extensions() {
        let cases = [
            (MediaFilter::Video, "Video Files"),
            (MediaFilter::Audio, "Audio Files"),
            (MediaFilter::Image, "Image Files"),
            (MediaFilter::All, "Media Files"),
        ];

        for (filter, label) in cases {
            assert_eq!(filter.label(), label);
            assert!(!filter.extensions().is_empty());
        }
    }
}
