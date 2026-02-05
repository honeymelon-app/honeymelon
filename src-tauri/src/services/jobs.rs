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

use crate::{
    error::AppError,
    runner::{
        coordinator::JobCoordinator,
        events::TauriEmitter,
        external::{DefaultSpawnController, SpawnController},
    },
};
use std::sync::Arc;
use tauri::AppHandle;

pub trait JobServiceApi: Send + Sync {
    fn start_job(
        &self,
        app: AppHandle,
        job_id: String,
        args: Vec<String>,
        output_path: String,
        exclusive: bool,
    ) -> Result<(), AppError>;
    fn cancel_job(&self, job_id: &str) -> Result<bool, AppError>;
    fn set_max_concurrency(&self, limit: usize);
}

#[derive(Clone)]
pub struct JobService {
    coordinator: Arc<JobCoordinator>,
}

impl JobService {
    pub fn new_with_spawner(spawner: Arc<dyn SpawnController>) -> Self {
        Self {
            coordinator: Arc::new(JobCoordinator::with_spawner(spawner)),
        }
    }
}

impl Default for JobService {
    fn default() -> Self {
        Self::new_with_spawner(Arc::new(DefaultSpawnController))
    }
}

impl JobServiceApi for JobService {
    fn start_job(
        &self,
        app: AppHandle,
        job_id: String,
        args: Vec<String>,
        output_path: String,
        exclusive: bool,
    ) -> Result<(), AppError> {
        let emitter = Arc::new(TauriEmitter::new(app.clone()));
        self.coordinator
            .start_job(app, emitter, job_id, args, output_path, exclusive)
    }

    fn cancel_job(&self, job_id: &str) -> Result<bool, AppError> {
        self.coordinator.cancel_job(job_id)
    }

    fn set_max_concurrency(&self, limit: usize) {
        self.coordinator.set_max_concurrency(limit);
    }
}
