/**
 * VisualRenderer class
 * Manages WebGL2 fragment shader rendering for audio visualization
 * Renders to a fullscreen canvas with audio-reactive uniforms
 */

import { WebGLError } from '../utils/errors.js';
import { createFullscreenQuad, deleteResource, setUniform } from './gl-utils.js';
import { compileVisualShader } from './ShaderCompiler.js';

export class VisualRenderer {
  #canvas;
  #gl;
  #program;
  #compiledProgram;
  #vao;
  #vbo;

  constructor() {
    this.#canvas = null;
    this.#gl = null;
    this.#program = null;
    this.#compiledProgram = null;
    this.#vao = null;
    this.#vbo = null;
  }

  /**
   * Initialize the renderer with the visualizer canvas
   * @throws {WebGLError}
   */
  init() {
    this.#canvas = document.getElementById('visualizerCanvas');
    if (!this.#canvas) {
      throw new WebGLError('Visualizer canvas not found');
    }

    this.#gl = this.#canvas.getContext('webgl2');
    if (!this.#gl) {
      throw new WebGLError('WebGL2 not supported');
    }

    this.resizeCanvas();
  }

  /**
   * Resize canvas to match window dimensions
   */
  resizeCanvas() {
    if (!this.#canvas || !this.#gl) return;

    this.#canvas.width = window.innerWidth;
    this.#canvas.height = window.innerHeight;
    this.#gl.viewport(0, 0, this.#canvas.width, this.#canvas.height);
  }

  /**
   * Compile a visual shader (stages it, does not apply immediately)
   * @param {string} mainCode - User GLSL code containing visualMain()
   * @param {string} [utilsCode=''] - Optional utility functions
   * @throws {ShaderCompileError}
   */
  compile(mainCode, utilsCode = '') {
    const gl = this.#gl;
    const program = compileVisualShader(gl, mainCode, utilsCode);

    if (this.#compiledProgram && this.#compiledProgram !== this.#program) {
      deleteResource(gl, 'program', this.#compiledProgram);
    }

    this.#compiledProgram = program;

    if (!this.#program) {
      this.#program = this.#compiledProgram;
    }

    if (!this.#vao) {
      const quad = createFullscreenQuad(gl, program);
      this.#vao = quad.vao;
      this.#vbo = quad.vbo;
    }
  }

  /**
   * Apply the previously compiled shader as the active shader
   */
  applyCompiledShader() {
    if (!this.#compiledProgram) return;

    const oldProgram = this.#program;
    this.#program = this.#compiledProgram;

    if (oldProgram && oldProgram !== this.#compiledProgram) {
      deleteResource(this.#gl, 'program', oldProgram);
    }
  }

  /**
   * Whether a compiled shader is staged and ready to apply
   * @returns {boolean}
   */
  get hasCompiledShader() {
    return this.#compiledProgram !== null && this.#compiledProgram !== this.#program;
  }

  /**
   * Render a frame with audio analysis data
   * @param {Object} analysisData - Audio analysis values from AudioAnalyzer.getValues()
   * @param {number} currentTime - Current playback time in seconds
   */
  render(analysisData, currentTime) {
    if (!this.#gl || !this.#program || !this.#vao) return;

    const gl = this.#gl;

    gl.useProgram(this.#program);
    gl.bindVertexArray(this.#vao);

    setUniform(gl, this.#program, 'u_resolution', '2f', this.#canvas.width, this.#canvas.height);
    setUniform(gl, this.#program, 'u_time', '1f', currentTime);

    if (analysisData) {
      setUniform(gl, this.#program, 'u_kick', '1f', analysisData.kick || 0);
      setUniform(gl, this.#program, 'u_hihat', '1f', analysisData.hihat || 0);
      setUniform(gl, this.#program, 'u_bass', '1f', analysisData.bass || 0);

      setUniform(gl, this.#program, 'u_kickPeak', '1f', analysisData.kickPeak || 0);
      setUniform(gl, this.#program, 'u_hihatPeak', '1f', analysisData.hihatPeak || 0);
      setUniform(gl, this.#program, 'u_bassPeak', '1f', analysisData.bassPeak || 0);

      setUniform(gl, this.#program, 'u_kickOnset', '1f', analysisData.kickOnset ? 1.0 : 0.0);
      setUniform(gl, this.#program, 'u_hihatOnset', '1f', analysisData.hihatOnset ? 1.0 : 0.0);
      setUniform(gl, this.#program, 'u_bassOnset', '1f', analysisData.bassOnset ? 1.0 : 0.0);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  /**
   * Destroy and release all WebGL resources
   */
  destroy() {
    const gl = this.#gl;
    if (!gl) return;

    deleteResource(gl, 'program', this.#program);
    if (this.#compiledProgram && this.#compiledProgram !== this.#program) {
      deleteResource(gl, 'program', this.#compiledProgram);
    }

    if (this.#vbo) gl.deleteBuffer(this.#vbo);
    if (this.#vao) gl.deleteVertexArray(this.#vao);

    this.#program = null;
    this.#compiledProgram = null;
    this.#vao = null;
    this.#vbo = null;
  }
}
