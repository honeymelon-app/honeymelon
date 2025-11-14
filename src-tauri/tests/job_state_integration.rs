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
