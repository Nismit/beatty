import { AUDIO } from '../utils/consts.js';

/**
 * AudioScheduler factory function
 * Manages audio buffer generation timing and beat offset tracking
 * Dependencies are injected to avoid coupling between Audio and GL layers
 *
 * Beat-based tracking enables seamless BPM changes during playback:
 * - Internally tracks position in beats (not seconds)
 * - Converts to seconds only when generating audio buffers
 * - BPM changes preserve musical position (e.g., "4th bar, 3rd beat")
 *
 * @param {Object} deps
 * @param {function(number, number): Promise<Float32Array>} deps.generateBuffer - Buffer generation function (beatOffset, bpm)
 * @param {import('../state/AudioSettings.js').AudioSettings} deps.audioSettings - Audio settings
 * @param {import('./AudioEngine.js').AudioEngine} deps.audioEngine - Audio engine for sending buffers
 * @returns {AudioScheduler}
 */

/**
 * @typedef {Object} AudioScheduler
 * @property {function(): Promise<Float32Array>} requestInitialBuffer - Generate first buffer
 * @property {function(): Promise<void>} requestNextBuffer - Generate and send next buffer
 * @property {function(): void} reset - Reset beat offset
 * @property {function(): number} beatOffset - Current beat offset
 * @property {function(): void} destroy - Clean up
 */

/**
 * Creates a new AudioScheduler instance
 * @param {Object} deps
 * @param {function(number, number): Promise<Float32Array>} deps.generateBuffer
 * @param {import('../state/AudioSettings.js').AudioSettings} deps.audioSettings
 * @param {import('./AudioEngine.js').AudioEngine} deps.audioEngine
 * @returns {AudioScheduler}
 */
export function createAudioScheduler({ generateBuffer, audioSettings, audioEngine }) {
  let currentBeatOffset = 0;

  /**
   * Generate the initial buffer at beat offset 0
   * @returns {Promise<Float32Array>}
   */
  async function requestInitialBuffer() {
    currentBeatOffset = 0;
    const buffer = await generateBuffer(0, audioSettings.bpm);
    return buffer;
  }

  /**
   * Advance beat offset and generate next buffer
   * Sends the buffer directly to the AudioEngine worklet
   */
  async function requestNextBuffer() {
    currentBeatOffset += AUDIO.BEATS_PER_BAR;
    const buffer = await generateBuffer(currentBeatOffset, audioSettings.bpm);
    audioEngine.sendNextBuffer(buffer);
  }

  function reset() {
    currentBeatOffset = 0;
  }

  function destroy() {
    reset();
  }

  return {
    requestInitialBuffer,
    requestNextBuffer,
    get beatOffset() {
      return currentBeatOffset;
    },
    reset,
    destroy,
  };
}
