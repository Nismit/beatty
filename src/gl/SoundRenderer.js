/**
 * SoundRenderer class
 * Manages WebGL2 Transform Feedback for GPU-based audio generation
 * Handles shader compilation, buffer pooling, and async GPU readback
 */

import { AUDIO } from '../utils/consts.js';
import { WebGLError } from '../utils/errors.js';
import { cleanupTransformFeedback, createBuffer, deleteResource, setUniform } from './gl-utils.js';
import { compileSoundShader } from './ShaderCompiler.js';

export class SoundRenderer {
  #gl;
  #program;
  #compiledProgram;
  #transformFeedback;
  #bufferPool;
  #pendingBuffers;

  constructor() {
    const canvas = document.createElement('canvas');
    this.#gl = canvas.getContext('webgl2');
    if (!this.#gl) {
      throw new WebGLError('WebGL2 is not supported');
    }

    this.#program = null;
    this.#compiledProgram = null;
    this.#transformFeedback = null;
    this.#bufferPool = new Map();
    this.#pendingBuffers = new Map();
  }

  /**
   * Compile a sound shader (stages it, does not apply immediately)
   * @param {string} mainCode - User GLSL code containing mainSound()
   * @param {string} [utilsCode=''] - Optional utility functions
   * @throws {ShaderCompileError}
   */
  compile(mainCode, utilsCode = '') {
    const program = compileSoundShader(this.#gl, mainCode, utilsCode);

    if (this.#compiledProgram && this.#compiledProgram !== this.#program) {
      deleteResource(this.#gl, 'program', this.#compiledProgram);
    }

    this.#compiledProgram = program;

    if (!this.#program) {
      this.#program = this.#compiledProgram;
    }

    if (!this.#transformFeedback) {
      this.#transformFeedback = this.#gl.createTransformFeedback();
    }
  }

  /**
   * Apply the previously compiled shader as the active shader
   * @throws {WebGLError}
   */
  applyCompiledShader() {
    if (!this.#compiledProgram) {
      throw new WebGLError('No compiled shader available to apply');
    }

    if (this.#program && this.#program !== this.#compiledProgram) {
      deleteResource(this.#gl, 'program', this.#program);
    }

    this.#program = this.#compiledProgram;
  }

  /**
   * Whether a compiled shader is staged and ready to apply
   * @returns {boolean}
   */
  get hasCompiledShader() {
    return this.#compiledProgram !== null && this.#compiledProgram !== this.#program;
  }

  /**
   * Generate an audio buffer using Transform Feedback
   * @param {number} beatOffset - Beat offset (musical position in beats)
   * @param {number} bpm - Beats per minute
   * @param {number} sampleRate - Audio sample rate
   * @returns {Promise<Float32Array>} Stereo interleaved audio data
   */
  generateAudioBuffer(beatOffset, bpm, sampleRate) {
    return new Promise((resolve, reject) => {
      try {
        const gl = this.#gl;
        const samplesPerBar = Math.floor((AUDIO.SAMPLES_PER_BAR_MULTIPLIER * sampleRate) / bpm);

        // Convert beat offset to seconds for shader
        // beatOffset * 60 / bpm = seconds
        const blockOffset = (beatOffset * 60.0) / bpm;

        const buffer = this.#getPooledBuffer(samplesPerBar);

        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.#transformFeedback);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffer);

        gl.useProgram(this.#program);
        setUniform(gl, this.#program, 'u_sampleRate', '1f', sampleRate);
        setUniform(gl, this.#program, 'u_bpm', '1f', bpm);
        setUniform(gl, this.#program, 'u_blockOffset', '1f', blockOffset);

        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, samplesPerBar);
        gl.endTransformFeedback();
        gl.disable(gl.RASTERIZER_DISCARD);

        cleanupTransformFeedback(gl);

        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        this.#pendingBuffers.set(sync, { buffer, samplesPerBar, resolve, reject });
        this.#pollFence(sync);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get a buffer from pool or create a new one
   * @param {number} samplesPerBar
   * @returns {WebGLBuffer}
   */
  #getPooledBuffer(samplesPerBar) {
    const bufferSize = samplesPerBar * AUDIO.BYTES_PER_SAMPLE * AUDIO.STEREO;

    if (!this.#bufferPool.has(bufferSize)) {
      this.#bufferPool.set(bufferSize, []);
    }

    const pool = this.#bufferPool.get(bufferSize);
    return pool.pop() || createBuffer(this.#gl, bufferSize, this.#gl.DYNAMIC_READ);
  }

  /**
   * Return buffer to pool (capped at 3)
   * @param {WebGLBuffer} buffer
   * @param {number} samplesPerBar
   */
  #returnBuffer(buffer, samplesPerBar) {
    const bufferSize = samplesPerBar * AUDIO.BYTES_PER_SAMPLE * AUDIO.STEREO;
    const pool = this.#bufferPool.get(bufferSize);
    if (!pool) return;

    pool.push(buffer);
    if (pool.length > 3) {
      deleteResource(this.#gl, 'buffer', pool.shift());
    }
  }

  /**
   * Poll GPU fence for completion
   * @param {WebGLSync} sync
   */
  #pollFence(sync) {
    const gl = this.#gl;
    const status = gl.clientWaitSync(sync, 0, 0);

    if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
      this.#completePending(sync);
    } else if (status === gl.TIMEOUT_EXPIRED) {
      setTimeout(() => this.#pollFence(sync), 0);
    } else {
      const pending = this.#pendingBuffers.get(sync);
      if (pending) {
        pending.reject(new WebGLError('GPU sync error'));
        this.#cleanupPending(sync);
      }
    }
  }

  /**
   * Read back completed buffer data
   * @param {WebGLSync} sync
   */
  #completePending(sync) {
    const gl = this.#gl;
    const pending = this.#pendingBuffers.get(sync);
    if (!pending) return;

    try {
      const { buffer, samplesPerBar, resolve } = pending;

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const audioData = new Float32Array(samplesPerBar * AUDIO.STEREO);
      gl.getBufferSubData(gl.ARRAY_BUFFER, 0, audioData);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      this.#returnBuffer(buffer, samplesPerBar);
      resolve(audioData);
    } catch (error) {
      pending.reject(error);
    } finally {
      this.#cleanupPending(sync);
    }
  }

  /**
   * Clean up a pending buffer entry
   * @param {WebGLSync} sync
   */
  #cleanupPending(sync) {
    deleteResource(this.#gl, 'sync', sync);
    this.#pendingBuffers.delete(sync);
  }

  /**
   * Destroy and release all WebGL resources
   */
  destroy() {
    const gl = this.#gl;

    for (const [sync, pending] of this.#pendingBuffers) {
      pending.reject(new WebGLError('Renderer destroyed'));
      deleteResource(gl, 'sync', sync);
    }
    this.#pendingBuffers.clear();

    for (const [, pool] of this.#bufferPool) {
      for (const buffer of pool) {
        deleteResource(gl, 'buffer', buffer);
      }
    }
    this.#bufferPool.clear();

    deleteResource(gl, 'program', this.#program);
    if (this.#compiledProgram && this.#compiledProgram !== this.#program) {
      deleteResource(gl, 'program', this.#compiledProgram);
    }

    this.#program = null;
    this.#compiledProgram = null;
    this.#transformFeedback = null;
  }
}
