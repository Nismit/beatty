/**
 * Custom error classes for Beatty application
 * Provides structured error handling with specific error types
 */

/**
 * Base error class for all Beatty errors
 */
export class BeattyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BeattyError';
  }
}

/**
 * Error thrown when shader compilation fails
 */
export class ShaderCompileError extends BeattyError {
  /**
   * @param {string} message - Error message
   * @param {'sound' | 'visual'} shaderType - Type of shader that failed
   * @param {number | null} lineNumber - Line number where error occurred
   */
  constructor(message, shaderType, lineNumber = null) {
    super(message);
    this.name = 'ShaderCompileError';
    this.shaderType = shaderType;
    this.lineNumber = lineNumber;
  }
}

/**
 * Error thrown when AudioContext operations fail
 */
export class AudioContextError extends BeattyError {
  /**
   * @param {string} message - Error message
   * @param {Error | null} originalError - Original error that caused this
   */
  constructor(message, originalError = null) {
    super(message);
    this.name = 'AudioContextError';
    this.originalError = originalError;
  }
}

/**
 * Error thrown when WebGL operations fail
 */
export class WebGLError extends BeattyError {
  constructor(message) {
    super(message);
    this.name = 'WebGLError';
  }
}

/**
 * Creates an error handler function that displays errors via StatusDisplay
 * @param {Object} statusDisplay - StatusDisplay instance with showError method
 * @returns {function(Error): void} Error handler function
 */
export function createErrorHandler(statusDisplay) {
  return function handleError(error) {
    console.error(error);

    if (error instanceof ShaderCompileError) {
      const line = error.lineNumber ? ` (line ${error.lineNumber})` : '';
      statusDisplay.showError(`Shader Error${line}: ${error.message}`);
    } else if (error instanceof AudioContextError) {
      statusDisplay.showError(`Audio Error: ${error.message}`);
    } else if (error instanceof WebGLError) {
      statusDisplay.showError(`WebGL Error: ${error.message}`);
    } else {
      statusDisplay.showError(`Error: ${error.message}`);
    }
  };
}
