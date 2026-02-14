/**
 * WebGL utility functions
 * Pure functions for buffer creation, uniform setting, and resource management
 */

import { ShaderCompileError, WebGLError } from '../utils/errors.js';

/**
 * Create and compile a WebGL shader
 * @param {WebGL2RenderingContext} gl
 * @param {number} type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param {string} source - GLSL source code
 * @param {'sound' | 'visual'} shaderType - Shader type for error reporting
 * @returns {WebGLShader}
 * @throws {ShaderCompileError}
 */
export function compileShader(gl, type, source, shaderType) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new ShaderCompileError(error, shaderType);
  }

  return shader;
}

/**
 * Create and link a WebGL program
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertexSource
 * @param {string} fragmentSource
 * @param {'sound' | 'visual'} shaderType - For error reporting
 * @param {string[] | null} [transformFeedbackVaryings]
 * @returns {WebGLProgram}
 * @throws {WebGLError}
 */
export function createProgram(gl, vertexSource, fragmentSource, shaderType, transformFeedbackVaryings = null) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource, shaderType);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, shaderType);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  if (transformFeedbackVaryings) {
    gl.transformFeedbackVaryings(program, transformFeedbackVaryings, gl.INTERLEAVED_ATTRIBS);
  }

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(program);
    throw new WebGLError(`Program link failed: ${error}`);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

/**
 * Create a buffer with specified size and usage
 * @param {WebGL2RenderingContext} gl
 * @param {number} size - Buffer size in bytes
 * @param {number} usage - e.g. gl.DYNAMIC_READ
 * @returns {WebGLBuffer}
 */
export function createBuffer(gl, size, usage) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, size, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buffer;
}

/**
 * Create a full-screen quad VAO for visualizer rendering
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLProgram} program
 * @returns {{ vao: WebGLVertexArrayObject, vbo: WebGLBuffer }}
 */
export function createFullscreenQuad(gl, program) {
  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return { vao, vbo };
}

/**
 * Set uniform value with type dispatch
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLProgram} program
 * @param {string} name
 * @param {string} type - '1f', '2f', '3f', '4f', '1i', '2i'
 * @param {...number} values
 */
export function setUniform(gl, program, name, type, ...values) {
  const location = gl.getUniformLocation(program, name);
  if (location === null) return;

  switch (type) {
    case '1f': gl.uniform1f(location, values[0]); break;
    case '2f': gl.uniform2f(location, values[0], values[1]); break;
    case '3f': gl.uniform3f(location, values[0], values[1], values[2]); break;
    case '4f': gl.uniform4f(location, values[0], values[1], values[2], values[3]); break;
    case '1i': gl.uniform1i(location, values[0]); break;
    case '2i': gl.uniform2i(location, values[0], values[1]); break;
  }
}

/**
 * Clean up transform feedback bindings
 * @param {WebGL2RenderingContext} gl
 */
export function cleanupTransformFeedback(gl) {
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
}

/**
 * Safe resource deletion
 * @param {WebGL2RenderingContext} gl
 * @param {'program' | 'buffer' | 'sync'} type
 * @param {*} resource
 */
export function deleteResource(gl, type, resource) {
  if (!resource) return;

  switch (type) {
    case 'program': gl.deleteProgram(resource); break;
    case 'buffer': gl.deleteBuffer(resource); break;
    case 'sync': gl.deleteSync(resource); break;
  }
}
