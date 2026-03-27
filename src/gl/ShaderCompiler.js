/**
 * ShaderCompiler - Pure functions for building and compiling shaders
 * No state, just input → output transformations
 */

import { WEBGL } from '../utils/consts.js';
import { createProgram } from './gl-utils.js';

/**
 * Base number of lines in shader preambles (before user code)
 * Used to adjust error line numbers to match user code
 */
export const PREAMBLE_LINES = {
  SOUND: 13,
  VISUAL: 29,
};

/**
 * Count lines in a string
 * @param {string} code
 * @returns {number}
 */
function countLines(code) {
  if (!code) return 0;
  return code.split('\n').length;
}

/**
 * Combine utils and main code with proper separation
 * @param {string} mainCode
 * @param {string} utilsCode
 * @returns {{ combined: string, utilsLines: number }}
 */
function combineCode(mainCode, utilsCode) {
  if (!utilsCode || utilsCode.trim() === '') {
    return { combined: mainCode, utilsLines: 0 };
  }
  // Add blank line between utils and main for clarity
  const combined = `${utilsCode}\n\n${mainCode}`;
  // +2 for the blank lines between utils and main
  const utilsLines = countLines(utilsCode) + 2;
  return { combined, utilsLines };
}

/**
 * Build a sound vertex shader from user code
 * @param {string} mainCode - User-provided GLSL mainSound function
 * @param {string} [utilsCode=''] - Optional utility functions
 * @returns {{ source: string, utilsLines: number }} Complete vertex shader source and utils line count
 */
export function buildSoundShader(mainCode, utilsCode = '') {
  const { combined, utilsLines } = combineCode(mainCode, utilsCode);
  const source = `#version 300 es
precision highp float;
uniform float u_sampleRate;
uniform float u_bpm;
uniform float u_blockOffset;
out vec2 v_audioSample;

// Constants
#define PI 3.14159265359
#define TAU 6.28318530718
#define SEMITONE 1.05946309436
#define saturate(x) clamp((x), 0.0, 1.0)

${combined}

void main() {
  float time = u_blockOffset + float(gl_VertexID) / u_sampleRate;
  vec2 out2 = mainSound(time);

  // Sanitize NaN/Inf values to prevent audio glitches
  if (any(isnan(out2)) || any(isinf(out2))) {
    out2 = vec2(0.0);
  }

  v_audioSample = out2;
}`;
  return { source, utilsLines };
}

/**
 * Build a visual fragment shader from user code
 * @param {string} mainCode - User-provided GLSL visualMain function
 * @param {string} [utilsCode=''] - Optional utility functions
 * @returns {{ source: string, utilsLines: number }} Complete fragment shader source and utils line count
 */
export function buildVisualShader(mainCode, utilsCode = '') {
  const { combined, utilsLines } = combineCode(mainCode, utilsCode);
  const source = `#version 300 es
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
#define SEMITONE 1.05946309436
#define saturate(x) clamp((x), 0.0, 1.0)

${combined}

void main() {
  vec3 color = visualMain(v_uv, u_resolution);
  fragColor = vec4(color, 1.0);
}`;
  return { source, utilsLines };
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
 * @param {string} mainCode - User GLSL main code
 * @param {string} [utilsCode=''] - Optional utility functions
 * @returns {WebGLProgram}
 * @throws {ShaderCompileError}
 */
export function compileSoundShader(gl, mainCode, utilsCode = '') {
  const { source: vertexSource, utilsLines } = buildSoundShader(mainCode, utilsCode);
  const fragmentSource = getAudioFragmentShader();
  return createProgram(
    gl,
    vertexSource,
    fragmentSource,
    'sound',
    WEBGL.TRANSFORM_FEEDBACK_VARYINGS,
    { vertex: PREAMBLE_LINES.SOUND, utilsLines },
  );
}

/**
 * Compile a visual shader program
 * @param {WebGL2RenderingContext} gl
 * @param {string} mainCode - User GLSL main code
 * @param {string} [utilsCode=''] - Optional utility functions
 * @returns {WebGLProgram}
 * @throws {ShaderCompileError}
 */
export function compileVisualShader(gl, mainCode, utilsCode = '') {
  const vertexSource = getFullscreenVertexShader();
  const { source: fragmentSource, utilsLines } = buildVisualShader(mainCode, utilsCode);
  return createProgram(gl, vertexSource, fragmentSource, 'visual', null, {
    fragment: PREAMBLE_LINES.VISUAL,
    utilsLines,
  });
}
