use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

/// Manages concurrency limits for FFmpeg jobs
pub struct ConcurrencyManager {
    max_concurrency: Arc<AtomicUsize>,
}

impl ConcurrencyManager {
    pub fn new() -> Self {
        Self {
            max_concurrency: Arc::new(AtomicUsize::new(2)),
        }
    }

    /// Gets the current concurrency limit
    pub fn get_limit(&self) -> usize {
        self.max_concurrency.load(Ordering::SeqCst).max(1)
    }

    /// Updates the maximum number of concurrent conversions allowed
    pub fn set_limit(&self, limit: usize) {
        self.max_concurrency.store(limit.max(1), Ordering::SeqCst);
    }
}

impl Default for ConcurrencyManager {
    fn default() -> Self {
        Self::new()
    }
}

impl Clone for ConcurrencyManager {
    fn clone(&self) -> Self {
        Self {
            max_concurrency: Arc::clone(&self.max_concurrency),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_concurrency() {
        let manager = ConcurrencyManager::new();
        assert_eq!(manager.get_limit(), 2);
    }

    #[test]
    fn test_set_concurrency() {
        let manager = ConcurrencyManager::new();
        manager.set_limit(5);
        assert_eq!(manager.get_limit(), 5);
    }

    #[test]
    fn test_minimum_concurrency() {
        let manager = ConcurrencyManager::new();
        manager.set_limit(0);
        assert_eq!(manager.get_limit(), 1); // Minimum is 1
    }
}
