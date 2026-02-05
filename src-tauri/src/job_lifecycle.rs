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

//! Backend mirror of the frontend job lifecycle state machine.
//!
//! This module intentionally mirrors `src/lib/job-lifecycle.ts` so both the
//! Vue/Pinia frontend and the Tauri backend describe the exact same job states
//! and legal transitions. Keeping the graph in sync across languages helps us
//! document the contract clearly and spot regressions during testing.

#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum JobStatus {
    Queued,
    Probing,
    Planning,
    Running,
    Completed,
    Failed,
    Cancelled,
}

pub const JOB_STATUS_SEQUENCE: [JobStatus; 7] = [
    JobStatus::Queued,
    JobStatus::Probing,
    JobStatus::Planning,
    JobStatus::Running,
    JobStatus::Completed,
    JobStatus::Failed,
    JobStatus::Cancelled,
];

pub const TERMINAL_STATUSES: [JobStatus; 3] = [
    JobStatus::Completed,
    JobStatus::Failed,
    JobStatus::Cancelled,
];

pub const ACTIVE_STATUSES: [JobStatus; 3] =
    [JobStatus::Probing, JobStatus::Planning, JobStatus::Running];

impl JobStatus {
    pub const fn is_terminal(self) -> bool {
        matches!(
            self,
            JobStatus::Completed | JobStatus::Failed | JobStatus::Cancelled
        )
    }

    pub const fn is_active(self) -> bool {
        matches!(
            self,
            JobStatus::Probing | JobStatus::Planning | JobStatus::Running
        )
    }

    pub fn allowed_transitions(self) -> &'static [JobStatus] {
        match self {
            JobStatus::Queued => QUEUED_TRANSITIONS,
            JobStatus::Probing => PROBING_TRANSITIONS,
            JobStatus::Planning => PLANNING_TRANSITIONS,
            JobStatus::Running => RUNNING_TRANSITIONS,
            JobStatus::Completed => COMPLETED_TRANSITIONS,
            JobStatus::Failed => FAILED_TRANSITIONS,
            JobStatus::Cancelled => CANCELLED_TRANSITIONS,
        }
    }
}

const QUEUED_TRANSITIONS: &[JobStatus] = &[JobStatus::Probing, JobStatus::Cancelled];
const PROBING_TRANSITIONS: &[JobStatus] = &[
    JobStatus::Planning,
    JobStatus::Failed,
    JobStatus::Cancelled,
    JobStatus::Queued,
];
const PLANNING_TRANSITIONS: &[JobStatus] = &[
    JobStatus::Running,
    JobStatus::Failed,
    JobStatus::Cancelled,
    JobStatus::Queued,
];
const RUNNING_TRANSITIONS: &[JobStatus] = &[
    JobStatus::Completed,
    JobStatus::Failed,
    JobStatus::Cancelled,
    JobStatus::Queued,
];
const COMPLETED_TRANSITIONS: &[JobStatus] = &[JobStatus::Queued];
const FAILED_TRANSITIONS: &[JobStatus] = &[JobStatus::Queued];
const CANCELLED_TRANSITIONS: &[JobStatus] = &[JobStatus::Queued];

pub fn can_transition_status(from: JobStatus, to: JobStatus) -> bool {
    from.allowed_transitions().contains(&to)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn queued_can_enter_probing() {
        assert!(can_transition_status(JobStatus::Queued, JobStatus::Probing));
    }

    #[test]
    fn running_requires_planning_first() {
        assert!(!can_transition_status(
            JobStatus::Queued,
            JobStatus::Running
        ));
    }

    #[test]
    fn failed_jobs_can_requeue() {
        assert!(can_transition_status(JobStatus::Failed, JobStatus::Queued));
    }
}
