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
