use crate::{error::AppError, fs_utils};

pub trait PathServiceApi: Send + Sync {
    fn expand_paths(&self, paths: Vec<String>) -> Result<Vec<String>, AppError>;
}

/// Handles filesystem operations such as expanding dropped folders.
#[derive(Clone, Default)]
pub struct PathService;

impl PathServiceApi for PathService {
    fn expand_paths(&self, paths: Vec<String>) -> Result<Vec<String>, AppError> {
        fs_utils::expand_media_paths(paths)
    }
}
