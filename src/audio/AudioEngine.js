/**
 * AudioEngine class
 * Manages Web Audio API context, AudioWorklet node, and AnalyserNode
 * Handles audio playback lifecycle (init, start, pause, resume, stop)
 */

import { AUDIO } from '../utils/consts.js';
import { AudioContextError } from '../utils/errors.js';

export class AudioEngine {
  #audioContext;
  #workletNode;
  #analyserNode;
  #frequencyData;
  #timeData;
  #isGeneratingNext;
  #onRequestNextBuffer;

  constructor() {
    this.#audioContext = null;
    this.#workletNode = null;
    this.#analyserNode = null;
    this.#frequencyData = null;
    this.#timeData = null;
    this.#isGeneratingNext = false;
    this.#onRequestNextBuffer = null;
  }

  get audioContext() {
    return this.#audioContext;
  }

  get sampleRate() {
    return this.#audioContext?.sampleRate ?? AUDIO.SAMPLE_RATE;
  }

  /**
   * Set callback for when worklet requests next buffer
   * @param {function(): Promise<void>} callback
   */
  set onRequestNextBuffer(callback) {
    this.#onRequestNextBuffer = callback;
  }

  /**
   * Initialize AudioContext, AudioWorklet, and AnalyserNode
   */
  async init() {
    try {
      this.#audioContext = new AudioContext();

      await this.#audioContext.audioWorklet.addModule('./audio/audio-worklet.js');

      this.#workletNode = new AudioWorkletNode(this.#audioContext, 'glsl-audio-processor');

      this.#workletNode.port.onmessage = (event) => {
        const { type, count } = event.data;
        if (type === 'requestNextBuffer') {
          this.#handleNextBufferRequest();
        } else if (type === 'bufferUnderrun') {
          console.warn(`[AudioEngine] Buffer underrun detected (count: ${count})`);
        }
      };

      this.#analyserNode = this.#audioContext.createAnalyser();
      this.#analyserNode.fftSize = AUDIO.FFT_SIZE;
      this.#analyserNode.smoothingTimeConstant = AUDIO.SMOOTHING_TIME_CONSTANT;
      this.#analyserNode.minDecibels = AUDIO.MIN_DECIBELS;
      this.#analyserNode.maxDecibels = AUDIO.MAX_DECIBELS;

      this.#frequencyData = new Uint8Array(this.#analyserNode.frequencyBinCount);
      this.#timeData = new Uint8Array(this.#analyserNode.frequencyBinCount);
    } catch (error) {
      throw new AudioContextError('Failed to initialize audio engine', error);
    }
  }

  /**
   * Start audio playback
   * @param {Float32Array} initialBuffer - First audio buffer to play
   * @param {number} volume - Playback volume (0-1)
   */
  async start(initialBuffer, volume) {
    try {
      if (this.#audioContext.state === 'suspended') {
        await this.#audioContext.resume();
      }

      this.#postToWorklet('setCurrentBuffer', initialBuffer);
      this.#postToWorklet('setVolume', volume);
      this.#postToWorklet('setReadPosition', 0);

      this.#workletNode.connect(this.#analyserNode);
      this.#analyserNode.connect(this.#audioContext.destination);
    } catch (error) {
      throw new AudioContextError('Failed to start audio', error);
    }
  }

  /**
   * Resume audio from paused state
   * @param {number} volume - Playback volume
   * @param {number} readPos - Read position to resume from
   */
  async resume(volume, readPos = 0) {
    try {
      if (this.#audioContext.state === 'suspended') {
        await this.#audioContext.resume();
      }

      this.#postToWorklet('setReadPosition', readPos);
      this.#postToWorklet('setVolume', volume);

      this.#workletNode.connect(this.#analyserNode);
      this.#analyserNode.connect(this.#audioContext.destination);
    } catch (error) {
      throw new AudioContextError('Failed to resume audio', error);
    }
  }

  /**
   * Pause audio playback
   */
  pause() {
    try {
      this.#workletNode.disconnect();
      this.#analyserNode.disconnect();
    } catch (error) {
      throw new AudioContextError('Failed to pause audio', error);
    }
  }

  /**
   * Stop audio and clear buffers
   */
  stop() {
    try {
      this.#workletNode.disconnect();
      this.#analyserNode.disconnect();
    } catch (error) {
      throw new AudioContextError('Failed to stop audio', error);
    }
  }

  /**
   * Send next buffer to the worklet
   * @param {Float32Array} buffer
   */
  sendNextBuffer(buffer) {
    this.#postToWorklet('setNextBuffer', buffer);
  }

  /**
   * Set playback volume
   * @param {number} volume
   */
  setVolume(volume) {
    this.#postToWorklet('setVolume', volume);
  }

  /**
   * Get current audio analysis data
   * @returns {{ frequencyData: Uint8Array, timeData: Uint8Array } | null}
   */
  getAnalysisData() {
    if (!this.#frequencyData || !this.#timeData) return null;

    this.#analyserNode.getByteFrequencyData(this.#frequencyData);
    this.#analyserNode.getByteTimeDomainData(this.#timeData);

    return {
      frequencyData: this.#frequencyData,
      timeData: this.#timeData,
    };
  }

  /**
   * Handle worklet's request for next buffer
   */
  async #handleNextBufferRequest() {
    if (this.#isGeneratingNext || !this.#onRequestNextBuffer) return;

    this.#isGeneratingNext = true;
    try {
      await this.#onRequestNextBuffer();
    } catch (error) {
      console.error('[AudioEngine] Buffer generation error:', error);
    } finally {
      this.#isGeneratingNext = false;
    }
  }

  /**
   * Post message to AudioWorklet
   * @param {string} type
   * @param {*} data
   */
  #postToWorklet(type, data) {
    if (!this.#workletNode?.port) {
      console.warn('[AudioEngine] Worklet node not initialized');
      return;
    }
    this.#workletNode.port.postMessage({ type, data });
  }

  /**
   * Destroy and release all resources
   */
  destroy() {
    try {
      this.#workletNode?.disconnect();
      this.#analyserNode?.disconnect();
      this.#audioContext?.close();
    } catch (error) {
      console.error('[AudioEngine] Cleanup error:', error);
    }

    this.#audioContext = null;
    this.#workletNode = null;
    this.#analyserNode = null;
    this.#frequencyData = null;
    this.#timeData = null;
    this.#onRequestNextBuffer = null;
  }
}
