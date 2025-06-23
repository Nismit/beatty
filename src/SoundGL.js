import { AUDIO } from './consts.js';
import {  
  createProgram, 
  createBuffer, 
  cleanupTransformFeedback, 
  setUniform, 
  deleteResource,
  buildSoundShader,
} from './utils.js';


/**
 * @param {number} bpm 
 * @param {number} sampleRate 
 * @returns {number} Number of samples per 1 bar based on BPM and sample rate
 */
const getSamplesPer1Bar = (bpm, sampleRate = 44100) => Math.floor((240 * sampleRate) / bpm);

export class SoundGL {
  constructor() {
    const canvas = document.createElement('canvas');
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) {
      throw new Error('WebGL2 is not supported in this browser.');
    }

    this.program = null;
    this.compiledProgram = null
    this.transformFeedback = null;

    this.pendingBuffers = new Map();
    this.bufferPool = new Map();
  }

  compile(userCode) {
    const vertexSource = buildSoundShader(userCode);
    const fragmentSource = `#version 300 es
void main(void) {}`;

    // Use utils functions to create program with transform feedback
    const program = createProgram(
      this.gl,
      vertexSource,
      fragmentSource,
      ['v_audioSample']
    );

    if (this.compiledProgram && this.compiledProgram !== this.program) {
      deleteResource(this.gl, 'program', this.compiledProgram);
    }

    this.compiledProgram = program;

    if (!this.program) {
      this.program = this.compiledProgram;
    }

    if (!this.transformFeedback) {
      this.transformFeedback = this.gl.createTransformFeedback();
    }
  }

  getBuffer(samplesPerBar) {
    const gl = this.gl;

    const bufferSize = samplesPerBar * 4 * AUDIO.STEREO;
    
    if (!this.bufferPool.has(bufferSize)) {
      this.bufferPool.set(bufferSize, []);
    }
    
    const pool = this.bufferPool.get(bufferSize);
    let buffer = pool.pop();
    
    if (!buffer) {
      buffer = createBuffer(gl, bufferSize, gl.DYNAMIC_READ);
    }
    
    return buffer;
  }

  returnBuffer(buffer, samplesPerBar) {
    const bufferSize = samplesPerBar * 4 * AUDIO.STEREO;
    const pool = this.bufferPool.get(bufferSize);
    if (pool) {
      pool.push(buffer);
      
      if (pool.length > 3) {
        const oldBuffer = pool.shift();
        deleteResource(this.gl, 'buffer', oldBuffer);
      }
    }
  }

  generateAudioBuffer(blockOffset, bpm, sampleRate) {
    return new Promise((resolve, reject) => {
      try {
        const gl = this.gl;
        const samplesPerBar = getSamplesPer1Bar(bpm, sampleRate);
    
        const buffer = this.getBuffer(samplesPerBar);

        // setupTransformFeedback(this.gl, this.transformFeedback, buffer);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedback);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffer);

        gl.useProgram(this.program);

        // Use utils functions for setting uniforms
        setUniform(gl, this.program, 'u_sampleRate', '1f', sampleRate);
        setUniform(gl, this.program, 'u_bpm', '1f', bpm);
        setUniform(gl, this.program, 'u_blockOffset', '1f', blockOffset);

        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, samplesPerBar);
        gl.endTransformFeedback();
        gl.disable(gl.RASTERIZER_DISCARD);

        cleanupTransformFeedback(gl);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);

        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

        this.pendingBuffers.set(sync, {
          buffer: buffer,
          blockOffset: blockOffset,
          samplesPerBar: samplesPerBar,
          resolve: resolve,
          reject: reject,
        });

        this.checkFenceCompletion(sync);
      } catch (error) {
        reject(error);
      }
    });
  }

  checkFenceCompletion(sync) {
    const gl = this.gl;
    const status = gl.clientWaitSync(sync, 0, 0);

    if (
      status === gl.ALREADY_SIGNALED ||
      status === gl.CONDITION_SATISFIED
    ) {
      this.completePendingBuffer(sync);
    } else if (status === gl.TIMEOUT_EXPIRED) {
      requestAnimationFrame(() => this.checkFenceCompletion(sync));
    } else {
      const pendingBuffer = this.pendingBuffers.get(sync);
      if (pendingBuffer) {
        pendingBuffer.reject(new Error('GPU sync error'));
        this.cleanupPendingBuffer(sync);
      }
    }
  }

  completePendingBuffer(sync) {
    const gl = this.gl;
    const pendingBuffer = this.pendingBuffers.get(sync);
    if (!pendingBuffer) return;

    try {
      const { buffer, samplesPerBar, resolve } = pendingBuffer;

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const audioData = new Float32Array(samplesPerBar * AUDIO.STEREO);
      gl.getBufferSubData(gl.ARRAY_BUFFER, 0, audioData);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      this.returnBuffer(buffer, samplesPerBar);

      resolve(audioData);
    } catch (error) {
      pendingBuffer.reject(error);
    } finally {
      this.cleanupPendingBuffer(sync);
    }
  }

  cleanupPendingBuffer(sync) {
    deleteResource(this.gl, 'sync', sync);
    this.pendingBuffers.delete(sync);
  }

  applyCompiledShader() {
    if (!this.compiledProgram) {
      throw new Error('No compiled shader available to apply');
    }

    try {
      const gl = this.gl;
      
      if (this.program && this.program !== this.compiledProgram) {
        deleteResource(gl, 'program', this.program);
      }

      this.program = this.compiledProgram;
      
    } catch (error) {
      console.error('SoundGL: Apply compiled shader error:', error);
      throw error;
    }
  }
}
  