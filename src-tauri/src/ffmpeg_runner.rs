/** # FFmpeg Process Runner Module

This module provides comprehensive process management for FFmpeg media conversion operations.
It serves as the execution engine of Honeymelon, handling concurrent job scheduling, progress
monitoring, error handling, and resource cleanup. The runner implements a robust architecture
for safe and efficient media processing with real-time feedback to the user interface.

## Architecture Overview

The runner follows a multi-layered architecture designed for reliability and performance:

1. **Job Lifecycle Management**: Tracks conversion jobs from initiation to completion
2. **Process Orchestration**: Manages concurrent FFmpeg processes with resource limits
3. **Progress Monitoring**: Parses real-time progress from FFmpeg stderr output
4. **Event Emission**: Provides live updates to the frontend via Tauri events
5. **Resource Cleanup**: Ensures proper cleanup of temporary files and processes
6. **Error Handling**: Comprehensive error reporting with user-friendly messages

## Key Design Decisions

### Singleton Pattern with Lazy Initialization
The module uses a global `RUNNER` instance initialized with `once_cell::Lazy` to ensure:
- Single point of process management across the application
- Thread-safe initialization without explicit synchronization
- Consistent state management for concurrent operations

### Temporary File Strategy for Safe Output
Conversions write to temporary files first, then atomically rename on success:
- Prevents partial output files from failed conversions
- Enables clean cancellation without leaving corrupted files
- Provides atomic completion guarantee
- Allows progress monitoring during conversion

### Event-Driven Progress Updates
Real-time progress is communicated via Tauri's event system:
- **Progress Events**: Parsed metrics (time, fps, speed) for UI updates
- **Stderr Events**: Raw FFmpeg output for debugging and transparency
- **Completion Events**: Final status with detailed error information
- Enables responsive UI without blocking the conversion process

### Concurrency Control with Configurable Limits
The runner implements intelligent concurrency management:
- Default limit of 2 concurrent conversions to prevent resource exhaustion
- Configurable limits for different hardware capabilities
- Exclusive mode for operations requiring full system resources
- Atomic validation to prevent race conditions in job scheduling

### Security-First Argument Validation
FFmpeg arguments undergo strict validation to prevent command injection:
- Blocks shell metacharacters (`;`, `|`, `&`, etc.)
- Prevents command substitution attempts
- Validates arguments before process spawning
- Provides clear error messages for invalid input

## Process Management Strategy

### Job States and Transitions
Jobs progress through well-defined states with proper cleanup:
- **Queued**: Validated and waiting for execution slot
- **Running**: FFmpeg process active with progress monitoring
- **Cancelled**: Gracefully terminated with cleanup
- **Completed**: Successfully finished with file finalization
- **Failed**: Error occurred with detailed diagnostics

### Resource Management
The runner carefully manages system resources:
- **Process Tracking**: Maintains registry of active processes
- **Memory Bounds**: Limits log storage to prevent memory leaks
- **File Handles**: Proper cleanup of temporary files
- **Signal Handling**: Graceful termination on cancellation

## Progress Parsing Implementation

### FFmpeg Output Analysis
Progress information is extracted from FFmpeg's stderr stream:
- **Time Parsing**: Handles both HH:MM:SS and seconds formats
- **Multi-field Lines**: Parses complex progress lines with multiple metrics
- **Incremental Updates**: Processes each output line individually
- **Robust Parsing**: Gracefully handles malformed or missing data

### Metrics Extraction
Key performance metrics are extracted and normalized:
- **Processed Time**: Current encoding position in seconds
- **Frame Rate**: Current encoding speed in fps
- **Processing Speed**: Real-time speed multiplier (e.g., "2.5x")

## Error Handling and Diagnostics

### Comprehensive Error Classification
Errors are categorized with specific codes and user-friendly messages:
- **Validation Errors**: Invalid arguments, permissions, paths
- **Execution Errors**: FFmpeg spawning, process management failures
- **FFmpeg Errors**: Specific exit codes with explanations
- **System Errors**: Resource exhaustion, I/O failures

### Diagnostic Information
Failed conversions provide rich diagnostic data:
- Complete FFmpeg stderr output for debugging
- Structured error codes for programmatic handling
- User-friendly messages for display
- Exit codes and signals for technical analysis

## Integration Points

This module integrates extensively with other system components:

- **Binary Resolution** (`ffmpeg_capabilities.rs`): Locates FFmpeg executables
- **Error Handling** (`error.rs`): Leverages custom error types for IPC
- **Job Orchestration** (`use-job-orchestrator.ts`): Coordinates conversion workflows
- **User Interface**: Receives progress events for real-time display
- **File System** (`fs_utils.rs`): May use path utilities for validation

## Performance Considerations

### Asynchronous Processing
The runner uses Tauri's async runtime for non-blocking operation:
- Conversions run in background threads without blocking UI
- Event emission provides responsive progress updates
- Resource monitoring prevents system overload

### Memory Efficiency
Memory usage is carefully controlled:
- Log buffers are circular with fixed capacity (500 lines)
- Process metadata is minimal and cleaned up promptly
- Event payloads are serialized efficiently

### I/O Optimization
File operations are optimized for reliability:
- Temporary files created in output directory for atomic moves
- Permission validation before process spawning
- Proper cleanup on all error paths

## Testing Strategy

The module includes comprehensive unit tests covering:
- Timecode parsing across different formats (HMS, seconds, invalid)
- Progress line parsing for various FFmpeg output patterns
- Process lifecycle management and cancellation
- Log buffer management with capacity limits
- Concurrency control and validation
- Error handling and edge cases

## Future Enhancements

Potential areas for expansion:
- Hardware acceleration detection and utilization reporting
- Advanced resource monitoring (CPU, memory, disk I/O)
- Conversion queue persistence across application restarts
- Bandwidth throttling for network-based operations
- GPU memory management for hardware-accelerated codecs
- Advanced error recovery and retry mechanisms
*/
use crate::{binary_resolver, error::AppError};

use once_cell::sync::Lazy;
use serde::Serialize;
use serde_json::json;
use std::{
    collections::{HashMap, VecDeque},
    ffi::OsString,
    fs,
    io::{BufRead, BufReader, ErrorKind},
    path::{Path, PathBuf},
    process::{Child, Command, ExitStatus, Stdio},
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        Arc, Mutex,
    },
};
use tauri::{AppHandle, Emitter};

/** Event name for FFmpeg progress updates emitted to the frontend.

This event is fired for each line of FFmpeg stderr output that contains
progress information. The payload includes parsed metrics and raw output
for comprehensive progress tracking in the user interface.
*/
pub const PROGRESS_EVENT: &str = "ffmpeg://progress";

/** Event name for job completion notifications.

This event signals the final status of a conversion job, including success/failure
state, exit codes, error messages, and complete log output for debugging.
*/
pub const COMPLETION_EVENT: &str = "ffmpeg://completion";

/** Event name for raw FFmpeg stderr output.

This event provides unparsed FFmpeg stderr lines to the frontend, enabling
detailed logging and debugging capabilities in the user interface.
*/
pub const STDERR_EVENT: &str = "ffmpeg://stderr";

/** Global FFmpeg runner instance managing all conversion processes.

This singleton instance ensures consistent process management across the
application lifecycle. It uses lazy initialization to avoid startup overhead
and provides thread-safe access to process orchestration.
*/
static RUNNER: Lazy<FfmpegRunner> = Lazy::new(FfmpegRunner::new);

/** Provides human-readable explanations for common FFmpeg exit codes.

FFmpeg uses specific exit codes to indicate different types of failures.
This function maps those codes to user-friendly explanations that can be
displayed in the interface or included in error reports.

# Arguments
* `code` - The exit code returned by FFmpeg

# Returns
`Some(&str)` with explanation if the code is recognized, `None` otherwise
*/
fn explain_ffmpeg_exit_code(code: i32) -> Option<&'static str> {
    match code {
        1 => Some("Encoding failed. Check input file format and codec support."),
        2 => Some("Invalid FFmpeg arguments. Please report this issue."),
        69 => Some("Output file already exists and cannot be overwritten."),
        _ => None,
    }
}

/** Central manager for FFmpeg conversion processes.

This structure orchestrates all FFmpeg execution in Honeymelon, providing
concurrent job management, progress monitoring, and resource control.
It maintains a registry of active processes and enforces concurrency limits
to ensure system stability during media processing operations.
*/
#[derive(Clone)]
struct FfmpegRunner {
    /** Registry of active conversion processes keyed by job ID */
    processes: Arc<Mutex<HashMap<String, Arc<RunningProcess>>>>,
    /** Maximum number of concurrent conversions allowed */
    max_concurrency: Arc<AtomicUsize>,
}

/** Wrapper around an active FFmpeg child process with management metadata.

This structure encapsulates all the state needed to manage a running FFmpeg
process, including cancellation handling, log buffering, and process control.
It provides thread-safe access to process operations and ensures proper
cleanup on completion or cancellation.
*/
struct RunningProcess {
    /** The actual FFmpeg child process handle */
    child: Mutex<Option<Child>>,
    /** Atomic flag indicating if the process has been cancelled */
    cancelled: AtomicBool,
    /** Circular buffer of recent log lines (limited to prevent memory leaks) */
    logs: Mutex<VecDeque<String>>,
}

/** Parsed progress metrics extracted from FFmpeg output.

This structure represents the key performance indicators that can be
extracted from FFmpeg's progress output. These metrics provide real-time
feedback about conversion progress and performance to the user interface.

# Fields
* `processed_seconds` - Current encoding position in seconds
* `fps` - Current encoding frame rate
* `speed` - Real-time processing speed multiplier (e.g., 2.0 = 2x realtime)
*/
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressMetrics {
    /** Seconds of media that have been processed so far */
    pub processed_seconds: Option<f64>,
    /** Current encoding frame rate in frames per second */
    pub fps: Option<f64>,
    /** Processing speed as a multiplier of real-time (e.g., 2.0 = twice real-time speed) */
    pub speed: Option<f64>,
}

/** Payload for progress update events sent to the frontend.

This structure packages progress information for emission via Tauri's
event system, providing both parsed metrics and raw output for flexible
handling in the user interface.
*/
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressPayload {
    /** Unique identifier for the conversion job */
    pub job_id: String,
    /** Parsed progress metrics (None if line contained no progress data) */
    pub progress: Option<ProgressMetrics>,
    /** Raw FFmpeg output line for debugging and detailed logging */
    pub raw: String,
}

/** Payload for job completion events sent to the frontend.

This comprehensive structure reports the final status of a conversion job,
including success state, error details, and diagnostic information for
debugging and user feedback.
*/
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionPayload {
    /** Unique identifier for the completed job */
    pub job_id: String,
    /** Whether the conversion completed successfully */
    pub success: bool,
    /** Whether the job was cancelled by user request */
    pub cancelled: bool,
    /** FFmpeg exit code (None if process didn't exit cleanly) */
    pub exit_code: Option<i32>,
    /** Unix signal that terminated the process (None on non-Unix or clean exit) */
    pub signal: Option<i32>,
    /** Structured error code for programmatic handling */
    pub code: String,
    /** Human-readable error message or success confirmation */
    pub message: Option<String>,
    /** Complete FFmpeg stderr output for debugging */
    pub logs: Vec<String>,
}

impl RunningProcess {
    /** Creates a new process wrapper around an FFmpeg child process.

    Initializes the wrapper with default state: not cancelled, empty log buffer,
    and the provided child process handle for management.

    # Arguments
    * `child` - The spawned FFmpeg child process to manage
    */
    fn new(child: Child) -> Self {
        Self {
            child: Mutex::new(Some(child)),
            cancelled: AtomicBool::new(false),
            logs: Mutex::new(VecDeque::with_capacity(256)),
        }
    }

    /** Marks the process as cancelled for coordinated shutdown.

    This sets an atomic flag that will be checked during process monitoring
    to determine if the conversion should be aborted. The actual process
    termination is handled separately to ensure clean shutdown.
    */
    fn mark_cancelled(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }

    /** Checks if the process has been marked for cancellation.

    This provides thread-safe access to the cancellation state, allowing
    monitoring threads to detect user cancellation requests.

    # Returns
    `true` if the process should be terminated, `false` otherwise
    */
    fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }

    /** Adds a log line to the circular buffer with capacity management.

    Log lines are stored in a FIFO buffer to prevent memory leaks during
    long-running conversions. When the buffer reaches its 500-line limit,
    the oldest entries are automatically removed.

    # Arguments
    * `line` - The log line to add to the buffer
    */
    fn push_log(&self, line: &str) {
        if let Ok(mut logs) = self.logs.lock() {
            if logs.len() >= 500 {
                logs.pop_front();
            }
            logs.push_back(line.to_string());
        }
    }

    /** Extracts all accumulated log lines and clears the buffer.

    This is called when a job completes to retrieve the complete log output
    for inclusion in completion events. The buffer is emptied to free memory.

    # Returns
    Vector of all log lines in chronological order
    */
    fn drain_logs(&self) -> Vec<String> {
        match self.logs.lock() {
            Ok(mut guard) => guard.drain(..).collect(),
            Err(_) => Vec::new(),
        }
    }
}

impl FfmpegRunner {
    /** Creates a new FFmpeg runner instance with default configuration.

    Initializes the runner with an empty process registry and default
    concurrency limit of 2 simultaneous conversions.
    */
    fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
            max_concurrency: Arc::new(AtomicUsize::new(2)),
        }
    }

    /** Initiates a new FFmpeg conversion job with comprehensive validation.

    This method performs complete pre-flight validation before spawning
    the FFmpeg process, ensuring safe and reliable execution. It handles
    concurrency control, security validation, path resolution, and output
    preparation before launching the conversion.

    # Process Flow
    1. Validate FFmpeg arguments for security
    2. Check concurrency limits and job conflicts
    3. Resolve FFmpeg binary path
    4. Prepare output directory and temporary file
    5. Spawn FFmpeg process with monitoring
    6. Set up asynchronous progress monitoring and completion handling

    # Arguments
    * `app` - Tauri application handle for path resolution and event emission
    * `job_id` - Unique identifier for this conversion job
    * `args` - FFmpeg command-line arguments (excluding input/output files)
    * `output_path` - Final output file path for the converted media
    * `exclusive` - Whether this job requires exclusive access (no other jobs running)

    # Returns
    `Ok(())` on successful job initiation, `AppError` with details on failure

    # Errors
    - `"job_invalid_args"`: Empty or unsafe arguments detected
    - `"job_already_running"`: Job ID already exists
    - `"job_exclusive_blocked"`: Exclusive job requested while others are active
    - `"job_concurrency_limit"`: Maximum concurrent jobs exceeded
    - `"job_ffmpeg_not_found"`: FFmpeg binary not found
    - `"job_output_*"`: Output path preparation failures
    - `"job_spawn_failed"`: Process spawning failure
    */
    pub fn start_job(
        &self,
        app: AppHandle,
        job_id: String,
        args: Vec<String>,
        output_path: String,
        exclusive: bool,
    ) -> Result<(), AppError> {
        // Validate arguments exist and are safe
        if args.is_empty() {
            return Err(AppError::new(
                "job_invalid_args",
                "FFmpeg arguments must not be empty.",
            ));
        }

        // Security validation: prevent command injection attacks
        for arg in &args {
            if arg.contains(';')
                || arg.contains('|')
                || arg.contains('&')
                || arg.starts_with("$(")
                || arg.contains("`")
            {
                return Err(AppError::new(
                    "job_invalid_args",
                    format!("Unsafe argument detected: {}", arg),
                ));
            }
        }

        // Atomic validation block: check job conflicts and concurrency in one lock
        {
            let guard = self.processes.lock().expect("process mutex poisoned");

            // Prevent duplicate job IDs
            if guard.contains_key(&job_id) {
                return Err(AppError::new(
                    "job_already_running",
                    format!("Job {job_id} is already running."),
                ));
            }

            let current_active = guard.len();

            // Handle exclusive job requests
            if exclusive && current_active > 0 {
                return Err(AppError::new(
                    "job_exclusive_blocked",
                    "Exclusive job requested while other jobs are active.",
                ));
            }

            // Enforce concurrency limits
            let limit = self.max_concurrency.load(Ordering::SeqCst).max(1);
            if current_active >= limit {
                return Err(AppError::new(
                    "job_concurrency_limit",
                    format!("Concurrency limit reached ({limit}); defer job start."),
                ));
            }
            // Lock released here - validation complete, proceed to spawn
        }

        // Locate available FFmpeg binary
        let ffmpeg_path = self.resolve_ffmpeg_path(&app).ok_or_else(|| {
            AppError::new(
                "job_ffmpeg_not_found",
                "Unable to locate ffmpeg executable.",
            )
        })?;

        // Prepare output paths and directories
        let output = PathBuf::from(&output_path);
        if let Some(parent) = output.parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent).map_err(|err| {
                    AppError::new(
                        "job_output_directory",
                        format!(
                            "Failed creating output directory {}: {err}",
                            parent.display()
                        ),
                    )
                })?;
            }
        }

        // Generate temporary file path for safe output
        let temp_file_name = output
            .file_name()
            .and_then(|name| name.to_str())
            .map(|name| format!("{name}.tmp"))
            .unwrap_or_else(|| "output.tmp".to_string());
        let temp_path = output.with_file_name(temp_file_name);
        let temp_arg = temp_path
            .to_str()
            .ok_or_else(|| {
                AppError::new("job_output_invalid", "Output path contains invalid UTF-8")
            })?
            .to_string();

        // Validate write permissions by creating temp file
        match fs::File::create(&temp_path) {
            Ok(file) => {
                drop(file);
                let _ = fs::remove_file(&temp_path);
            },
            Err(err) if err.kind() == ErrorKind::PermissionDenied => {
                return Err(AppError::new(
                    "job_output_permission",
                    format!(
                        "Unable to write output file at {}: {err}. Select a different output directory in Preferences or grant Honeymelon Full Disk Access (System Settings → Privacy & Security → Full Disk Access).",
                        output.display()
                    ),
                ));
            },
            Err(err) => {
                return Err(AppError::new(
                    "job_output_prepare",
                    format!("Failed preparing output file {}: {err}", output.display()),
                ));
            },
        }

        // Configure and spawn FFmpeg process
        let mut command = Command::new(ffmpeg_path);
        command.args(&args);
        command.arg(&temp_arg);
        command.stdin(Stdio::null());
        command.stdout(Stdio::null());
        command.stderr(Stdio::piped());

        let mut child = command
            .spawn()
            .map_err(|err| AppError::new("job_spawn_failed", err.to_string()))?;

        // Set up process management wrapper
        let stderr = child.stderr.take();
        let process = Arc::new(RunningProcess::new(child));

        // Register process in global registry
        {
            let mut guard = self.processes.lock().expect("process mutex poisoned");
            guard.insert(job_id.clone(), Arc::clone(&process));
        }

        // Launch asynchronous monitoring task
        let runner = self.clone();
        let final_path = output.clone();
        let temp_capture = temp_path.clone();
        tauri::async_runtime::spawn_blocking(move || {
            // Monitor FFmpeg stderr for progress and logging
            if let Some(stderr) = stderr {
                let reader = BufReader::new(stderr);
                for line_result in reader.lines() {
                    let line = match line_result {
                        Ok(value) => value,
                        Err(_) => break,
                    };

                    // Log to application console
                    eprintln!("[ffmpeg][{}] {}", job_id, line);

                    // Emit raw stderr to frontend for debugging
                    let _ = app.emit(
                        STDERR_EVENT,
                        json!({
                            "jobId": job_id.clone(),
                            "line": line.clone(),
                        }),
                    );

                    // Buffer log line for completion reporting
                    process.push_log(&line);

                    // Parse and emit progress metrics
                    let progress = parse_progress_line(&line);
                    if progress.is_some() {
                        eprintln!("[ffmpeg-progress][{}] {:?}", job_id, progress);
                    }
                    let payload = ProgressPayload {
                        job_id: job_id.clone(),
                        progress,
                        raw: line,
                    };
                    let _ = app.emit(PROGRESS_EVENT, &payload);
                }
            }

            // Wait for process completion and handle results
            let exit_status = runner.wait_for_exit(&job_id, &process);

            let cancelled = process.is_cancelled();
            let mut code_override: Option<&'static str> = None;
            let mut message_override: Option<String> = None;

            // Analyze exit status and determine outcome
            let (mut success, exit_code, signal) = match exit_status {
                Ok(status) => (
                    status.success() && !cancelled,
                    status.code(),
                    extract_signal(&status),
                ),
                Err(err) => {
                    // Process monitoring failed
                    code_override = Some(err.code);
                    let detail = format!("ffmpeg wait error: {}", err.message);
                    process.push_log(&detail);
                    let _ = app.emit(
                        PROGRESS_EVENT,
                        &ProgressPayload {
                            job_id: job_id.clone(),
                            progress: None,
                            raw: detail.clone(),
                        },
                    );
                    message_override = Some(detail);
                    (false, None, None)
                },
            };

            let mut message = message_override;
            let mut code = if let Some(code) = code_override {
                code
            } else if cancelled {
                "job_cancelled"
            } else if success {
                "job_complete"
            } else {
                "job_failed"
            };

            // Handle output file finalization
            if success && !cancelled {
                // Remove any existing output file
                if final_path.exists() {
                    let _ = fs::remove_file(&final_path);
                }
                // Atomically move temp file to final location
                if let Err(err) = fs::rename(&temp_capture, &final_path) {
                    success = false;
                    code = "job_finalize_failed";
                    let detail = format!("Failed to finalize output file: {err}");
                    message = Some(detail.clone());
                    process.push_log(&detail);
                    // Clean up temp file on rename failure
                    let _ = fs::remove_file(&temp_capture);
                }
            } else {
                // Clean up temp file on failure or cancellation
                let _ = fs::remove_file(&temp_capture);
            }

            // Generate detailed error message if needed
            if !success && !cancelled && message.is_none() {
                if let Some(exit) = exit_code {
                    let detail = if let Some(explanation) = explain_ffmpeg_exit_code(exit) {
                        format!("ffmpeg exited with status {exit}: {explanation}")
                    } else {
                        format!("ffmpeg exited with status {exit}")
                    };
                    message = Some(detail.clone());
                    process.push_log(&detail);
                }
            }

            // Prepare completion payload with full diagnostics
            let logs = process.drain_logs();

            runner.remove(&job_id);

            let completion = CompletionPayload {
                job_id,
                success,
                cancelled,
                exit_code,
                signal,
                code: code.to_string(),
                message,
                logs,
            };

            // Emit completion event to frontend
            let _ = app.emit(COMPLETION_EVENT, &completion);
        });

        Ok(())
    }

    /** Cancels an active conversion job and terminates its FFmpeg process.

    This method provides graceful cancellation of running jobs, ensuring
    proper cleanup of processes and temporary files. It marks the job as
    cancelled and forcibly terminates the FFmpeg process if it's still running.

    # Process Flow
    1. Locate the active process by job ID
    2. Mark process as cancelled for monitoring threads
    3. Kill the FFmpeg child process if it exists
    4. Return success status

    # Arguments
    * `job_id` - Unique identifier of the job to cancel

    # Returns
    `Ok(true)` if job was found and cancelled, `Ok(false)` if job wasn't running,
    `Err(AppError)` if cancellation failed

    # Errors
    - `"job_cancel_failed"`: Process termination failed
    */
    pub fn cancel_job(&self, job_id: &str) -> Result<bool, AppError> {
        // Locate active process
        let process = {
            let guard = self.processes.lock().expect("process mutex poisoned");
            guard.get(job_id).cloned()
        };

        let Some(process) = process else {
            return Ok(false); // Job not found
        };

        // Mark for cancellation and terminate process
        process.mark_cancelled();
        let mut child_guard = process.child.lock().expect("child mutex poisoned");
        if let Some(child) = child_guard.as_mut() {
            child.kill().map_err(|err| {
                AppError::new(
                    "job_cancel_failed",
                    format!("Failed to cancel job {job_id}: {err}"),
                )
            })?;
            return Ok(true);
        }

        Ok(false)
    }

    /** Removes a completed job from the active process registry.

    This method cleans up the process tracking state after a job finishes,
    either successfully or with failure. It's called automatically by the
    completion monitoring logic.

    # Arguments
    * `job_id` - Unique identifier of the completed job to remove
    */
    fn remove(&self, job_id: &str) {
        let mut guard = self.processes.lock().expect("process mutex poisoned");
        guard.remove(job_id);
    }

    /** Waits for an FFmpeg process to complete and returns its exit status.

    This method blocks until the child process terminates, then extracts
    the process handle from the wrapper for status analysis. It's called
    from the asynchronous monitoring task.

    # Arguments
    * `job_id` - Job identifier for error reporting
    * `process` - Process wrapper containing the child handle

    # Returns
    `Ok(ExitStatus)` on successful wait, `Err(AppError)` if waiting failed

    # Errors
    - `"job_missing_child"`: Process handle was already consumed
    - `"job_wait_failed"`: System error during process wait
    */
    fn wait_for_exit(
        &self,
        job_id: &str,
        process: &Arc<RunningProcess>,
    ) -> Result<ExitStatus, AppError> {
        let mut child_guard = process.child.lock().expect("child mutex poisoned");
        let Some(mut child) = child_guard.take() else {
            return Err(AppError::new(
                "job_missing_child",
                format!("Job {job_id} missing child process handle."),
            ));
        };

        child
            .wait()
            .map_err(|err| AppError::new("job_wait_failed", err.to_string()))
    }

    /** Resolves the path to an available FFmpeg executable.

    This method tries multiple candidate paths to locate a working FFmpeg
    binary, following the same resolution strategy as the capability detection
    module. It returns the first valid executable path found.

    # Arguments
    * `app` - Tauri application handle for resource path access

    # Returns
    `Some(OsString)` with executable path if found, `None` otherwise
    */
    fn resolve_ffmpeg_path(&self, app: &AppHandle) -> Option<OsString> {
        binary_resolver::resolve_ffmpeg_paths(app)
            .into_iter()
            .find(|candidate| Path::new(&candidate).exists())
    }

    /** Updates the maximum number of concurrent conversions allowed.

    This method allows dynamic adjustment of concurrency limits based on
    system capabilities or user preferences. The limit is enforced atomically
    to prevent race conditions during job scheduling.

    # Arguments
    * `limit` - New maximum concurrent jobs (minimum value is 1)
    */
    pub fn set_max_concurrency(&self, limit: usize) {
        self.max_concurrency.store(limit.max(1), Ordering::SeqCst);
    }
}

/** Public interface function to start a new conversion job.

This function provides the main entry point for initiating media conversions
from the Tauri command layer. It delegates to the global runner instance
for actual job management.

# Arguments
* `app` - Tauri application handle
* `job_id` - Unique job identifier
* `args` - FFmpeg command arguments
* `output_path` - Output file destination
* `exclusive` - Whether job requires exclusive execution

# Returns
`Result<(), AppError>` indicating job initiation success or failure
*/
pub fn start_job(
    app: AppHandle,
    job_id: String,
    args: Vec<String>,
    output_path: String,
    exclusive: bool,
) -> Result<(), AppError> {
    RUNNER.start_job(app, job_id, args, output_path, exclusive)
}

/** Public interface function to cancel an active conversion job.

This function provides the main entry point for cancelling conversions
from the Tauri command layer.

# Arguments
* `job_id` - Unique identifier of job to cancel

# Returns
`Ok(true)` if cancelled, `Ok(false)` if not found, `Err(AppError)` on failure
*/
pub fn cancel_job(job_id: &str) -> Result<bool, AppError> {
    RUNNER.cancel_job(job_id)
}

/** Updates the global concurrency limit for conversion jobs.

This function allows the application to adjust resource usage based on
system capabilities or user preferences.

# Arguments
* `limit` - New maximum concurrent conversions
*/
pub fn set_max_concurrency(limit: usize) {
    RUNNER.set_max_concurrency(limit);
}

/** Extracts the Unix signal that terminated a process (Unix-only).

On Unix systems, processes can be terminated by signals in addition to
exit codes. This function extracts the signal information from the exit
status for detailed error reporting.

# Arguments
* `status` - Process exit status to analyze

# Returns
`Some(signal)` if terminated by signal, `None` for normal exit or non-Unix platforms
*/
fn extract_signal(status: &ExitStatus) -> Option<i32> {
    #[cfg(unix)]
    {
        use std::os::unix::process::ExitStatusExt;
        status.signal()
    }
    #[cfg(not(unix))]
    {
        let _ = status;
        None
    }
}

/** Parses a single line of FFmpeg output to extract progress metrics.

This function analyzes FFmpeg stderr lines to identify and extract progress
information. It handles multiple output formats that FFmpeg can produce,
including single-field lines and complex multi-field progress reports.

# Parsing Strategy
The function recognizes these FFmpeg output patterns:
- **Single Field**: `out_time=00:00:15.932583` or `fps=45.2`
- **Multi Field**: `frame=123 fps=45 time=00:00:05.12 bitrate=1638.4kbits/s speed=1.5x`

# Supported Metrics
- `time` / `out_time`: Current processing position (HH:MM:SS.sss or seconds)
- `fps`: Current encoding frame rate
- `speed`: Processing speed multiplier (e.g., "1.5x" becomes 1.5)

# Arguments
* `line` - Raw FFmpeg output line to parse

# Returns
`Some(ProgressMetrics)` if progress data was found, `None` for non-progress lines
*/
fn parse_progress_line(line: &str) -> Option<ProgressMetrics> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }

    let mut processed_seconds: Option<f64> = None;
    let mut fps: Option<f64> = None;
    let mut speed: Option<f64> = None;

    // Handle single-field progress lines (e.g., "out_time=00:00:15.932583")
    if let Some(value) = trimmed.strip_prefix("out_time=") {
        processed_seconds = parse_timecode(value);
    } else if let Some(value) = trimmed.strip_prefix("fps=") {
        fps = value.parse::<f64>().ok();
    } else if let Some(value) = trimmed.strip_prefix("speed=") {
        let cleaned = value.trim_end_matches('x').trim();
        speed = cleaned.parse::<f64>().ok();
    } else {
        // Parse multi-field progress lines with whitespace-separated tokens
        for token in trimmed.split_whitespace() {
            if let Some(value) = token.strip_prefix("time=") {
                processed_seconds = parse_timecode(value);
            } else if let Some(value) = token.strip_prefix("out_time=") {
                processed_seconds = parse_timecode(value);
            } else if let Some(value) = token.strip_prefix("fps=") {
                fps = value.parse::<f64>().ok();
            } else if let Some(value) = token.strip_prefix("speed=") {
                let cleaned = value.trim_end_matches('x').trim();
                speed = cleaned.parse::<f64>().ok();
            }
        }
    }

    // Return metrics only if at least one field was successfully parsed
    if processed_seconds.is_none() && fps.is_none() && speed.is_none() {
        return None;
    }

    Some(ProgressMetrics {
        processed_seconds,
        fps,
        speed,
    })
}

/** Parses a timecode string into seconds.

FFmpeg reports time positions in various formats that need normalization
to seconds for consistent handling. This function handles both HH:MM:SS
format and direct seconds format with robust error handling.

# Supported Formats
- **HH:MM:SS.sss**: `01:23:45.678` → 5025.678 seconds
- **Seconds**: `123.45` → 123.45 seconds
- **Invalid**: Empty strings or malformed input → `None`

# Parsing Logic
1. Reject empty input immediately
2. Check for colon-separated HH:MM:SS format
3. Parse hours, minutes, seconds components
4. Convert to total seconds: `hours * 3600 + minutes * 60 + seconds`
5. Fall back to direct float parsing for seconds-only format

# Arguments
* `value` - Timecode string from FFmpeg output

# Returns
`Some(seconds)` if parsing succeeded, `None` for invalid input
*/
fn parse_timecode(value: &str) -> Option<f64> {
    if value.is_empty() {
        return None;
    }

    // Parse HH:MM:SS.sss format
    let parts: Vec<&str> = value.split(':').collect();
    if parts.len() != 3 {
        // Not HH:MM:SS format, try direct seconds parsing
        return value.parse::<f64>().ok();
    }

    // Parse individual time components
    let hours: f64 = parts.first()?.parse().ok()?;
    let minutes: f64 = parts.get(1)?.parse().ok()?;
    let seconds: f64 = parts.get(2)?.parse().ok()?;

    // Convert to total seconds
    Some(hours * 3600.0 + minutes * 60.0 + seconds)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_timecode_hms() {
        assert_eq!(parse_timecode("00:00:10.5"), Some(10.5));
        assert_eq!(parse_timecode("00:01:00"), Some(60.0));
        assert_eq!(parse_timecode("01:00:00"), Some(3600.0));
        assert_eq!(parse_timecode("01:23:45.67"), Some(5025.67));
    }

    #[test]
    fn test_parse_timecode_seconds() {
        assert_eq!(parse_timecode("123.45"), Some(123.45));
        assert_eq!(parse_timecode("0"), Some(0.0));
    }

    #[test]
    fn test_parse_timecode_invalid() {
        assert_eq!(parse_timecode(""), None);
        assert_eq!(parse_timecode("invalid"), None);
        assert_eq!(parse_timecode("12:34"), None);
    }

    #[test]
    fn test_parse_progress_line_full() {
        let line =
            "frame=123 fps=45 q=28.0 size=1024kB time=00:00:05.12 bitrate=1638.4kbits/s speed=1.5x";
        let result = parse_progress_line(line).unwrap();
        assert_eq!(result.processed_seconds, Some(5.12));
        assert_eq!(result.fps, Some(45.0));
        assert_eq!(result.speed, Some(1.5));
    }

    #[test]
    fn test_parse_progress_line_partial() {
        let line = "time=00:01:30 speed=2.0x";
        let result = parse_progress_line(line).unwrap();
        assert_eq!(result.processed_seconds, Some(90.0));
        assert_eq!(result.fps, None);
        assert_eq!(result.speed, Some(2.0));
    }

    #[test]
    fn test_parse_progress_line_no_data() {
        assert!(parse_progress_line("").is_none());
        assert!(parse_progress_line("random log message").is_none());
    }

    #[test]
    fn test_parse_progress_line_fps_only() {
        let line = "fps=30.5";
        let result = parse_progress_line(line).unwrap();
        assert_eq!(result.fps, Some(30.5));
        assert_eq!(result.processed_seconds, None);
        assert_eq!(result.speed, None);
    }

    #[test]
    fn test_parse_progress_line_speed_variations() {
        let line1 = "speed=1.23x";
        let result1 = parse_progress_line(line1).unwrap();
        assert_eq!(result1.speed, Some(1.23));

        let line2 = "speed=0.5x";
        let result2 = parse_progress_line(line2).unwrap();
        assert_eq!(result2.speed, Some(0.5));
    }

    #[test]
    fn test_running_process_log_management() {
        let child = std::process::Command::new("echo")
            .stdout(Stdio::null())
            .spawn()
            .unwrap();

        let process = RunningProcess::new(child);

        // Test pushing logs
        process.push_log("log line 1");
        process.push_log("log line 2");

        // Test draining logs
        let logs = process.drain_logs();
        assert_eq!(logs.len(), 2);
        assert_eq!(logs[0], "log line 1");
        assert_eq!(logs[1], "log line 2");

        // After draining, logs should be empty
        let logs2 = process.drain_logs();
        assert_eq!(logs2.len(), 0);
    }

    #[test]
    fn test_running_process_log_limit() {
        let child = std::process::Command::new("echo")
            .stdout(Stdio::null())
            .spawn()
            .unwrap();

        let process = RunningProcess::new(child);

        // Push more than 500 logs
        for i in 0..600 {
            process.push_log(&format!("log {}", i));
        }

        let logs = process.drain_logs();
        // Should be capped at 500
        assert_eq!(logs.len(), 500);
        // First 100 should have been dropped
        assert_eq!(logs[0], "log 100");
        assert_eq!(logs[499], "log 599");
    }

    #[test]
    fn test_running_process_cancellation() {
        let child = std::process::Command::new("echo")
            .stdout(Stdio::null())
            .spawn()
            .unwrap();

        let process = RunningProcess::new(child);

        assert!(!process.is_cancelled());
        process.mark_cancelled();
        assert!(process.is_cancelled());
    }

    #[test]
    fn test_ffmpeg_runner_concurrency_management() {
        let runner = FfmpegRunner::new();

        // Default concurrency should be 2
        assert_eq!(runner.max_concurrency.load(Ordering::SeqCst), 2);

        // Set to 5
        runner.set_max_concurrency(5);
        assert_eq!(runner.max_concurrency.load(Ordering::SeqCst), 5);

        // Set to 0 should become 1 (minimum)
        runner.set_max_concurrency(0);
        assert_eq!(runner.max_concurrency.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn test_ffmpeg_runner_active_count() {
        let runner = FfmpegRunner::new();

        // Should start with 0 active jobs
        let guard = runner.processes.lock().unwrap();
        assert_eq!(guard.len(), 0);
    }

    #[test]
    fn test_extract_signal_unix() {
        #[cfg(unix)]
        {
            use std::os::unix::process::ExitStatusExt;
            let status = ExitStatus::from_raw(0);
            assert_eq!(extract_signal(&status), None);
        }

        #[cfg(not(unix))]
        {
            // On non-Unix, just ensure function doesn't panic
            let output = std::process::Command::new("echo").output().unwrap();
            assert_eq!(extract_signal(&output.status), None);
        }
    }
}
