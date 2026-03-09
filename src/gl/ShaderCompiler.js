/**
 * ShaderCompiler - Pure functions for building and compiling shaders
 * No state, just input → output transformations
 */

import { WEBGL } from '../utils/consts.js';
import { createProgram } from './gl-utils.js';

/**
 * Number of lines in shader preambles (before user code)
 * Used to adjust error line numbers to match user code
 */
export const PREAMBLE_LINES = {
  SOUND: 11,
  VISUAL: 27,
};

/**
 * Build a sound vertex shader from user code
 * @param {string} userCode - User-provided GLSL mainSound function
 * @returns {string} Complete vertex shader source
 */
export function buildSoundShader(userCode) {
  return `#version 300 es
precision highp float;
uniform float u_sampleRate;
uniform float u_bpm;
uniform float u_blockOffset;
out vec2 v_audioSample;

// Constants
#define PI 3.14159265359
#define TAU 6.28318530718

${userCode}

void main() {
  float time = u_blockOffset + float(gl_VertexID) / u_sampleRate;
  v_audioSample = mainSound(time);
}`;
}

/**
 * Build a visual fragment shader from user code
 * @param {string} userCode - User-provided GLSL visualMain function
 * @returns {string} Complete fragment shader source
 */
export function buildVisualShader(userCode) {
  return `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;

// Audio analysis - smoothed values (0-1)
uniform float u_kick;
uniform float u_hihat;
uniform float u_bass;

// Peak values with decay (for flash effects)
uniform float u_kickPeak;
uniform float u_hihatPeak;
uniform float u_bassPeak;

// Onset detection (1.0 on beat hit, 0.0 otherwise)
uniform float u_kickOnset;
uniform float u_hihatOnset;
uniform float u_bassOnset;

in vec2 v_uv;
out vec4 fragColor;

// Constants
#define PI 3.14159265359
#define TAU 6.28318530718

${userCode}

void main() {
  vec3 color = visualMain(v_uv, u_resolution);
  fragColor = vec4(color, 1.0);
}`;
}

/**
 * Get the fullscreen quad vertex shader for visual rendering
 * @returns {string}
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
 * Get the minimal fragment shader for audio (Transform Feedback) processing
 * @returns {string}
 */
export function getAudioFragmentShader() {
  return `#version 300 es
void main(void) {}`;
}

/**
 * Compile a sound shader program with Transform Feedback
 * @param {WebGL2RenderingContext} gl
 * @param {string} userCode - User GLSL code
 * @returns {WebGLProgram}
 * @throws {ShaderCompileError}
 */
export function compileSoundShader(gl, userCode) {
  const vertexSource = buildSoundShader(userCode);
  const fragmentSource = getAudioFragmentShader();
  return createProgram(
    gl,
    vertexSource,
    fragmentSource,
    'sound',
    WEBGL.TRANSFORM_FEEDBACK_VARYINGS,
    { vertex: PREAMBLE_LINES.SOUND },
  );
}

/**
 * Compile a visual shader program
 * @param {WebGL2RenderingContext} gl
 * @param {string} userCode - User GLSL code
 * @returns {WebGLProgram}
 * @throws {ShaderCompileError}
 */
export function compileVisualShader(gl, userCode) {
  const vertexSource = getFullscreenVertexShader();
  const fragmentSource = buildVisualShader(userCode);
  return createProgram(gl, vertexSource, fragmentSource, 'visual', null, {
    fragment: PREAMBLE_LINES.VISUAL,
  });
}
