/**
 * Chain of Responsibility Pattern for Job Validation
 *
 * Implements a flexible validation chain that allows adding, removing, or reordering
 * validation steps without modifying existing code. Each validator in the chain
 * performs a specific check and passes control to the next validator.
 */
use crate::error::AppError;
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

// NOTE: Many of the types and helpers here are exercised indirectly or are
// preserved for the validation architecture. Some are currently unused in the
// refactored code paths which causes clippy `dead_code` warnings. We allow
// dead_code on the individual items below rather than a crate/module-level
// inner attribute to avoid placement issues with file-level comments.

use super::progress_monitor::RunningProcess;

/**
 * Validation context containing all data needed for validation
 */
#[allow(dead_code)]
pub struct ValidationContext<'a> {
    pub job_id: &'a str,
    pub args: &'a [String],
    pub processes: &'a HashMap<String, Arc<RunningProcess>>,
    pub max_concurrency: usize,
    pub exclusive: bool,
    pub output_path: Option<&'a Path>,
}

/**
 * Result type for validation operations
 */
#[allow(dead_code)]
type ValidationResult = Result<(), AppError>;

/**
 * Validator trait - Each validator in the chain implements this
 */
#[allow(dead_code)]
pub trait Validator: Send + Sync {
    /**
     * Validates the context
     *
     * @param ctx - Validation context
     * @returns Ok(()) if validation passes, Err(AppError) otherwise
     */
    fn validate(&self, ctx: &ValidationContext) -> ValidationResult;

    /**
     * Returns the next validator in the chain
     */
    fn next(&self) -> Option<&dyn Validator>;

    /**
     * Sets the next validator in the chain
     */
    fn set_next(&mut self, next: Box<dyn Validator>);
}

/**
 * Argument validator - Checks for valid, non-empty, safe arguments
 */
#[allow(dead_code)]
pub struct ArgumentValidator {
    next: Option<Box<dyn Validator>>,
}

#[allow(dead_code)]
impl ArgumentValidator {
    pub fn new() -> Self {
        Self { next: None }
    }

    fn validate_args(args: &[String]) -> ValidationResult {
        if args.is_empty() {
            return Err(AppError::new(
                "job_invalid_args",
                "FFmpeg arguments cannot be empty",
            ));
        }

        // Check for shell injection attempts
        const UNSAFE_CHARS: &[char] = &[';', '|', '&', '$', '`', '\n', '\r'];

        for arg in args {
            if arg.chars().any(|c| UNSAFE_CHARS.contains(&c)) {
                return Err(AppError::new(
                    "job_invalid_args",
                    format!("Argument contains unsafe characters: {}", arg),
                ));
            }
        }

        Ok(())
    }
}

impl Validator for ArgumentValidator {
    fn validate(&self, ctx: &ValidationContext) -> ValidationResult {
        Self::validate_args(ctx.args)?;

        // Continue to next validator if exists
        if let Some(next) = &self.next {
            next.validate(ctx)?;
        }

        Ok(())
    }

    fn next(&self) -> Option<&dyn Validator> {
        self.next.as_ref().map(|b| b.as_ref())
    }

    fn set_next(&mut self, next: Box<dyn Validator>) {
        self.next = Some(next);
    }
}

/**
 * Concurrency validator - Checks job limits and exclusive execution
 */
#[allow(dead_code)]
pub struct ConcurrencyValidator {
    next: Option<Box<dyn Validator>>,
}

#[allow(dead_code)]
impl ConcurrencyValidator {
    pub fn new() -> Self {
        Self { next: None }
    }

    fn validate_concurrency(ctx: &ValidationContext) -> ValidationResult {
        // Check for duplicate job ID
        if ctx.processes.contains_key(ctx.job_id) {
            return Err(AppError::new(
                "job_already_running",
                format!("Job {} is already running", ctx.job_id),
            ));
        }

        let active_count = ctx.processes.len();

        // Check exclusive job blocking
        if ctx.exclusive && active_count > 0 {
            return Err(AppError::new(
                "job_exclusive_blocked",
                format!(
                    "Exclusive job {} blocked: {} jobs currently running",
                    ctx.job_id, active_count
                ),
            ));
        }

        // Check if any active job is exclusive
        for (id, process) in ctx.processes {
            if let Ok(guard) = process.exclusive.lock() {
                if *guard {
                    return Err(AppError::new(
                        "job_exclusive_blocked",
                        format!("Job {} blocked by exclusive job {}", ctx.job_id, id),
                    ));
                }
            }
        }

        // Check concurrency limit
        if active_count >= ctx.max_concurrency {
            return Err(AppError::new(
                "job_concurrency_limit",
                format!(
                    "Job {} blocked: concurrency limit {} reached ({} active)",
                    ctx.job_id, ctx.max_concurrency, active_count
                ),
            ));
        }

        Ok(())
    }
}

impl Validator for ConcurrencyValidator {
    fn validate(&self, ctx: &ValidationContext) -> ValidationResult {
        Self::validate_concurrency(ctx)?;

        // Continue to next validator
        if let Some(next) = &self.next {
            next.validate(ctx)?;
        }

        Ok(())
    }

    fn next(&self) -> Option<&dyn Validator> {
        self.next.as_ref().map(|b| b.as_ref())
    }

    fn set_next(&mut self, next: Box<dyn Validator>) {
        self.next = Some(next);
    }
}

/**
 * Path validator - Validates output paths
 */
#[allow(dead_code)]
pub struct PathValidator {
    next: Option<Box<dyn Validator>>,
}

#[allow(dead_code)]
impl PathValidator {
    pub fn new() -> Self {
        Self { next: None }
    }

    fn validate_path(output_path: &Path) -> ValidationResult {
        // Check if path is absolute
        if !output_path.is_absolute() {
            return Err(AppError::new(
                "job_output_invalid",
                "Output path must be absolute",
            ));
        }

        // Check if parent directory exists
        if let Some(parent) = output_path.parent() {
            if !parent.exists() {
                return Err(AppError::new(
                    "job_output_invalid",
                    format!("Parent directory does not exist: {}", parent.display()),
                ));
            }
        }

        // Check for path traversal attempts
        let path_str = output_path.to_string_lossy();
        if path_str.contains("..") {
            return Err(AppError::new(
                "job_output_invalid",
                "Output path cannot contain '..' (path traversal)",
            ));
        }

        Ok(())
    }
}

impl Validator for PathValidator {
    fn validate(&self, ctx: &ValidationContext) -> ValidationResult {
        if let Some(path) = ctx.output_path {
            Self::validate_path(path)?;
        }

        // Continue to next validator
        if let Some(next) = &self.next {
            next.validate(ctx)?;
        }

        Ok(())
    }

    fn next(&self) -> Option<&dyn Validator> {
        self.next.as_ref().map(|b| b.as_ref())
    }

    fn set_next(&mut self, next: Box<dyn Validator>) {
        self.next = Some(next);
    }
}

/**
 * Validation chain builder
 */
#[allow(dead_code)]
pub struct ValidationChainBuilder {
    head: Option<Box<dyn Validator>>,
    tail: Option<*mut dyn Validator>,
}

impl ValidationChainBuilder {
    pub fn new() -> Self {
        Self {
            head: None,
            tail: None,
        }
    }

    /**
     * Adds a validator to the end of the chain
     */
    pub fn add(mut self, validator: Box<dyn Validator>) -> Self {
        if self.head.is_none() {
            self.head = Some(validator);
            if let Some(ref head) = self.head {
                self.tail = Some(head.as_ref() as *const dyn Validator as *mut dyn Validator);
            }
        } else if let Some(tail_ptr) = self.tail {
            unsafe {
                (*tail_ptr).set_next(validator);
                if let Some(next) = (*tail_ptr).next() {
                    self.tail = Some(next as *const dyn Validator as *mut dyn Validator);
                }
            }
        }
        self
    }

    /**
     * Builds the validation chain
     */
    pub fn build(self) -> Option<Box<dyn Validator>> {
        self.head
    }
}

/**
 * Default validation chain
 */
#[allow(dead_code)]
pub fn create_default_chain() -> Box<dyn Validator> {
    ValidationChainBuilder::new()
        .add(Box::new(ArgumentValidator::new()))
        .add(Box::new(ConcurrencyValidator::new()))
        .add(Box::new(PathValidator::new()))
        .build()
        .expect("Failed to build validation chain")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_argument_validator_empty_args() {
        let validator = ArgumentValidator::new();
        let ctx = ValidationContext {
            job_id: "test",
            args: &[],
            processes: &HashMap::new(),
            max_concurrency: 2,
            exclusive: false,
            output_path: None,
        };

        let result = validator.validate(&ctx);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("empty"));
    }

    #[test]
    fn test_argument_validator_unsafe_chars() {
        let validator = ArgumentValidator::new();
        let ctx = ValidationContext {
            job_id: "test",
            args: &[String::from("safe"), String::from("unsafe;rm")],
            processes: &HashMap::new(),
            max_concurrency: 2,
            exclusive: false,
            output_path: None,
        };

        let result = validator.validate(&ctx);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("unsafe"));
    }

    #[test]
    fn test_concurrency_validator_limit() {
        let validator = ConcurrencyValidator::new();
        let mut processes = HashMap::new();

        // Add mock processes to reach limit
        for i in 0..2 {
            processes.insert(format!("job-{}", i), Arc::new(RunningProcess::new_mock()));
        }

        let ctx = ValidationContext {
            job_id: "new-job",
            args: &[String::from("arg1")],
            processes: &processes,
            max_concurrency: 2,
            exclusive: false,
            output_path: None,
        };

        let result = validator.validate(&ctx);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("limit"));
    }
}
