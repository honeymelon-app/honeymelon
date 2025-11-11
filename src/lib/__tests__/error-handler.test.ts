import { describe, it, expect } from 'vitest';
import { ErrorHandler, type ErrorDetails, type CompletionPayload } from '../error-handler';

describe('ErrorHandler', () => {
  describe('parseErrorDetails', () => {
    it('should parse Error instance', () => {
      const error = new Error('Something went wrong');
      const result = ErrorHandler.parseErrorDetails(error);

      expect(result.message).toBe('Something went wrong');
      expect(result.code).toBeUndefined();
    });

    it('should parse error object with message and code', () => {
      const error = { message: 'File not found', code: 'ENOENT' };
      const result = ErrorHandler.parseErrorDetails(error);

      expect(result.message).toBe('File not found');
      expect(result.code).toBe('ENOENT');
    });

    it('should parse error object with only message', () => {
      const error = { message: 'Generic error' };
      const result = ErrorHandler.parseErrorDetails(error);

      expect(result.message).toBe('Generic error');
      expect(result.code).toBeUndefined();
    });

    it('should parse error object without message (fallback to string)', () => {
      const error = { foo: 'bar' };
      const result = ErrorHandler.parseErrorDetails(error);

      expect(result.message).toBe('[object Object]');
      expect(result.code).toBeUndefined();
    });

    it('should parse error object with non-string code (ignored)', () => {
      const error = { message: 'Test error', code: 42 };
      const result = ErrorHandler.parseErrorDetails(error);

      expect(result.message).toBe('Test error');
      expect(result.code).toBeUndefined();
    });

    it('should parse string error', () => {
      const error = 'Simple error message';
      const result = ErrorHandler.parseErrorDetails(error);

      expect(result.message).toBe('Simple error message');
      expect(result.code).toBeUndefined();
    });

    it('should parse number error', () => {
      const error = 404;
      const result = ErrorHandler.parseErrorDetails(error);

      expect(result.message).toBe('404');
      expect(result.code).toBeUndefined();
    });

    it('should parse null error', () => {
      const error = null;
      const result = ErrorHandler.parseErrorDetails(error);

      expect(result.message).toBe('null');
      expect(result.code).toBeUndefined();
    });

    it('should parse undefined error', () => {
      const error = undefined;
      const result = ErrorHandler.parseErrorDetails(error);

      expect(result.message).toBe('undefined');
      expect(result.code).toBeUndefined();
    });

    it('should parse boolean error', () => {
      const error = false;
      const result = ErrorHandler.parseErrorDetails(error);

      expect(result.message).toBe('false');
      expect(result.code).toBeUndefined();
    });
  });

  describe('formatCompletionError', () => {
    it('should use message when provided', () => {
      const payload: CompletionPayload = {
        message: 'Encoding failed: invalid codec',
        exitCode: 1,
      };

      const result = ErrorHandler.formatCompletionError(payload);
      expect(result).toBe('Encoding failed: invalid codec');
    });

    it('should format exit code when message is null', () => {
      const payload: CompletionPayload = {
        message: null,
        exitCode: 1,
      };

      const result = ErrorHandler.formatCompletionError(payload);
      expect(result).toBe('FFmpeg exited with code 1');
    });

    it('should format exit code when message is undefined', () => {
      const payload: CompletionPayload = {
        exitCode: 2,
      };

      const result = ErrorHandler.formatCompletionError(payload);
      expect(result).toBe('FFmpeg exited with code 2');
    });

    it('should format zero exit code', () => {
      const payload: CompletionPayload = {
        message: null,
        exitCode: 0,
      };

      const result = ErrorHandler.formatCompletionError(payload);
      expect(result).toBe('FFmpeg exited with code 0');
    });

    it('should handle missing exit code with default message', () => {
      const payload: CompletionPayload = {
        message: null,
      };

      const result = ErrorHandler.formatCompletionError(payload);
      expect(result).toBe('FFmpeg process terminated unexpectedly.');
    });

    it('should handle null exit code with default message', () => {
      const payload: CompletionPayload = {
        message: null,
        exitCode: null,
      };

      const result = ErrorHandler.formatCompletionError(payload);
      expect(result).toBe('FFmpeg process terminated unexpectedly.');
    });

    it('should prefer message over exit code when both present', () => {
      const payload: CompletionPayload = {
        message: 'Custom error',
        exitCode: 1,
      };

      const result = ErrorHandler.formatCompletionError(payload);
      expect(result).toBe('Custom error');
    });

    it('should handle empty string message (not falsy in nullish coalescing)', () => {
      const payload: CompletionPayload = {
        message: '',
        exitCode: 1,
      };

      const result = ErrorHandler.formatCompletionError(payload);
      // Empty string is truthy in ?? operator, so it returns ''
      expect(result).toBe('');
    });

    it('should handle code field in payload (not used in formatting)', () => {
      const payload: CompletionPayload = {
        message: null,
        exitCode: 1,
        code: 'ERROR_CODE',
      };

      const result = ErrorHandler.formatCompletionError(payload);
      expect(result).toBe('FFmpeg exited with code 1');
    });
  });
});
