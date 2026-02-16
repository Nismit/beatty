import { describe, expect, it, vi } from 'vitest';
import {
  AudioContextError,
  BeattyError,
  createErrorHandler,
  ShaderCompileError,
  WebGLError,
} from '../../src/utils/errors.js';

describe('errors', () => {
  describe('BeattyError', () => {
    it('should create error with message', () => {
      const error = new BeattyError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('BeattyError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ShaderCompileError', () => {
    it('should create error with message and shader type', () => {
      const error = new ShaderCompileError('Syntax error', 'sound');

      expect(error.message).toBe('Syntax error');
      expect(error.name).toBe('ShaderCompileError');
      expect(error.shaderType).toBe('sound');
      expect(error.lineNumber).toBeNull();
    });

    it('should include line number when provided', () => {
      const error = new ShaderCompileError('Undefined variable', 'visual', 42);

      expect(error.lineNumber).toBe(42);
      expect(error.shaderType).toBe('visual');
    });

    it('should be instance of BeattyError', () => {
      const error = new ShaderCompileError('Error', 'sound');

      expect(error).toBeInstanceOf(BeattyError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('AudioContextError', () => {
    it('should create error with message', () => {
      const error = new AudioContextError('AudioContext failed');

      expect(error.message).toBe('AudioContext failed');
      expect(error.name).toBe('AudioContextError');
      expect(error.originalError).toBeNull();
    });

    it('should include original error when provided', () => {
      const originalError = new Error('Original');
      const error = new AudioContextError('Wrapped', originalError);

      expect(error.originalError).toBe(originalError);
    });

    it('should be instance of BeattyError', () => {
      const error = new AudioContextError('Error');

      expect(error).toBeInstanceOf(BeattyError);
    });
  });

  describe('WebGLError', () => {
    it('should create error with message', () => {
      const error = new WebGLError('WebGL2 not supported');

      expect(error.message).toBe('WebGL2 not supported');
      expect(error.name).toBe('WebGLError');
    });

    it('should be instance of BeattyError', () => {
      const error = new WebGLError('Error');

      expect(error).toBeInstanceOf(BeattyError);
    });
  });

  describe('createErrorHandler', () => {
    it('should return a function', () => {
      const statusDisplay = { showError: vi.fn() };
      const handler = createErrorHandler(statusDisplay);

      expect(typeof handler).toBe('function');
    });

    it('should handle ShaderCompileError', () => {
      const statusDisplay = { showError: vi.fn() };
      const handler = createErrorHandler(statusDisplay);
      const error = new ShaderCompileError('Syntax error', 'sound');

      handler(error);

      expect(statusDisplay.showError).toHaveBeenCalledWith('Shader Error: Syntax error');
    });

    it('should include line number for ShaderCompileError', () => {
      const statusDisplay = { showError: vi.fn() };
      const handler = createErrorHandler(statusDisplay);
      const error = new ShaderCompileError('Undefined', 'visual', 10);

      handler(error);

      expect(statusDisplay.showError).toHaveBeenCalledWith('Shader Error (line 10): Undefined');
    });

    it('should handle AudioContextError', () => {
      const statusDisplay = { showError: vi.fn() };
      const handler = createErrorHandler(statusDisplay);
      const error = new AudioContextError('Context failed');

      handler(error);

      expect(statusDisplay.showError).toHaveBeenCalledWith('Audio Error: Context failed');
    });

    it('should handle WebGLError', () => {
      const statusDisplay = { showError: vi.fn() };
      const handler = createErrorHandler(statusDisplay);
      const error = new WebGLError('WebGL2 not available');

      handler(error);

      expect(statusDisplay.showError).toHaveBeenCalledWith('WebGL Error: WebGL2 not available');
    });

    it('should handle generic errors', () => {
      const statusDisplay = { showError: vi.fn() };
      const handler = createErrorHandler(statusDisplay);
      const error = new Error('Unknown error');

      handler(error);

      expect(statusDisplay.showError).toHaveBeenCalledWith('Error: Unknown error');
    });

    it('should log error to console', () => {
      const statusDisplay = { showError: vi.fn() };
      const handler = createErrorHandler(statusDisplay);
      const error = new Error('Test');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      handler(error);

      expect(consoleSpy).toHaveBeenCalledWith(error);
      consoleSpy.mockRestore();
    });
  });
});
