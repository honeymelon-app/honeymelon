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

use honeymelon_lib::job_lifecycle::{can_transition_status, JobStatus};

#[test]
fn queued_jobs_follow_expected_transition_paths() {
    assert!(can_transition_status(JobStatus::Queued, JobStatus::Probing));
    assert!(can_transition_status(
        JobStatus::Probing,
        JobStatus::Planning
    ));
    assert!(can_transition_status(
        JobStatus::Planning,
        JobStatus::Running
    ));
    assert!(can_transition_status(
        JobStatus::Running,
        JobStatus::Completed
    ));
}

#[test]
fn invalid_state_changes_are_blocked() {
    assert!(
        !can_transition_status(JobStatus::Queued, JobStatus::Running),
        "must probe/plan before running"
    );
    assert!(
        !can_transition_status(JobStatus::Completed, JobStatus::Running),
        "completed jobs must never re-enter active states"
    );
}
