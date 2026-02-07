/**
 * WebGL utility functions for shader compilation and resource management
 * Refactored from class-based to function-based approach for better modularity
 */

/**
 * Create and compile a WebGL shader
 * @param {WebGL2RenderingContext} gl - WebGL context
 * @param {number} type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
 * @param {string} source - GLSL source code
 * @returns {WebGLShader} Compiled shader
 * @throws {Error} If shader compilation fails
 */
export function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${error}`);
  }

  return shader;
}

/**
 * Create a WebGL program from vertex and fragment shaders
 * @param {WebGL2RenderingContext} gl - WebGL context
 * @param {string} vertexSource - Vertex shader GLSL source
 * @param {string} fragmentSource - Fragment shader GLSL source
 * @param {string[]} transformFeedbackVaryings - Optional transform feedback varyings
 * @returns {WebGLProgram} Linked program
 * @throws {Error} If program linking fails
 */
export function createProgram(gl, vertexSource, fragmentSource, transformFeedbackVaryings = null) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

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
    throw new Error(`Program link failed: ${error}`);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

/**
 * Create a buffer with specified size and usage
 * @param {WebGL2RenderingContext} gl - WebGL context
 * @param {number} size - Buffer size in bytes
 * @param {number} usage - Buffer usage pattern (e.g., gl.DYNAMIC_READ)
 * @returns {WebGLBuffer} Created buffer
 */
export function createBuffer(gl, size, usage) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, size, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buffer;
}

/**
 * Cleanup transform feedback state
 * @param {WebGL2RenderingContext} gl - WebGL context
 */
export function cleanupTransformFeedback(gl) {
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
}

/**
 * Set uniform value with proper type handling
 * @param {WebGL2RenderingContext} gl - WebGL context
 * @param {WebGLProgram} program - Shader program
 * @param {string} name - Uniform name
 * @param {string} type - Uniform type ('1f', '2f', '1i', etc.)
 * @param {...any} values - Uniform values
 */
export function setUniform(gl, program, name, type, ...values) {
  const location = gl.getUniformLocation(program, name);
  if (location === null) return; // Uniform not found or optimized out
  
  switch (type) {
    case '1f': gl.uniform1f(location, values[0]); break;
    case '2f': gl.uniform2f(location, values[0], values[1]); break;
    case '3f': gl.uniform3f(location, values[0], values[1], values[2]); break;
    case '4f': gl.uniform4f(location, values[0], values[1], values[2], values[3]); break;
    case '1i': gl.uniform1i(location, values[0]); break;
    case '2i': gl.uniform2i(location, values[0], values[1]); break;
    default: throw new Error(`Unsupported uniform type: ${type}`);
  }
}

/**
 * Safe resource deletion with type checking
 * @param {WebGL2RenderingContext} gl - WebGL context
 * @param {string} type - Resource type ('program', 'shader', 'buffer', 'sync')
 * @param {any} resource - Resource to delete
 */
export function deleteResource(gl, type, resource) {
  if (!resource) return;
  
  switch (type) {
    case 'program': gl.deleteProgram(resource); break;
    case 'shader': gl.deleteShader(resource); break;
    case 'buffer': gl.deleteBuffer(resource); break;
    case 'sync': gl.deleteSync(resource); break;
    default: console.warn(`Unknown resource type: ${type}`);
  }
}

/**
 * Create a full-screen quad VAO for visualizer rendering
 * @param {WebGL2RenderingContext} gl - WebGL context
 * @param {WebGLProgram} program - Shader program
 * @returns {Object} Object containing VAO and VBO
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

// Shader template functions
/**
 * Build a sound shader with GLSL preprocessing
 * @param {string} userCode - User-provided GLSL sound code
 * @returns {string} Complete vertex shader source
 */
export function buildSoundShader(userCode) {
  return `#version 300 es
precision highp float;
uniform float u_sampleRate;
uniform float u_bpm;
uniform float u_blockOffset;
out vec2 v_audioSample;

${userCode}

void main() {
  float time = u_blockOffset + float(gl_VertexID) / u_sampleRate;
  v_audioSample = mainSound(time);
}`;
}

/**
 * Build a visual shader with GLSL preprocessing
 * @param {string} visualCode - User-provided GLSL visual code
 * @returns {string} Complete fragment shader source
 */
export function buildVisualShader(visualCode) {
  return `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_kick;
uniform float u_hihat;
uniform float u_bass;
uniform float u_time;
in vec2 v_uv;
out vec4 fragColor;

${visualCode}

void main() {
  vec3 color = visualMain(v_uv, u_resolution);
  fragColor = vec4(color, 1.0);
}`;
}

/**
 * Get the standard vertex shader for full-screen quad rendering
 * @returns {string} Vertex shader source for visualizer
 */
export function getFullscreenVertexShader() {
  return `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
}

/**
 * Get the minimal fragment shader for audio processing
 * @returns {string} Fragment shader source for audio processing
 */
export function getAudioFragmentShader() {
  return `#version 300 es
void main(void) {}`;
}
