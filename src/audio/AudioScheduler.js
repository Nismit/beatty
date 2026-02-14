/**
 * AudioScheduler factory function
 * Manages audio buffer generation timing and block offset tracking
 * Dependencies are injected to avoid coupling between Audio and GL layers
 *
 * @param {Object} deps
 * @param {function(number): Promise<Float32Array>} deps.generateBuffer - Buffer generation function
 * @param {import('../state/AudioSettings.js').AudioSettings} deps.audioSettings - Audio settings
 * @param {import('./AudioEngine.js').AudioEngine} deps.audioEngine - Audio engine for sending buffers
 * @returns {AudioScheduler}
 */

/**
 * @typedef {Object} AudioScheduler
 * @property {function(): Promise<Float32Array>} requestInitialBuffer - Generate first buffer
 * @property {function(): Promise<void>} requestNextBuffer - Generate and send next buffer
 * @property {function(): void} reset - Reset block offset
 * @property {function(): number} blockOffset - Current block offset
 * @property {function(): void} destroy - Clean up
 */

/**
 * Creates a new AudioScheduler instance
 * @param {Object} deps
 * @param {function(number): Promise<Float32Array>} deps.generateBuffer
 * @param {import('../state/AudioSettings.js').AudioSettings} deps.audioSettings
 * @param {import('./AudioEngine.js').AudioEngine} deps.audioEngine
 * @returns {AudioScheduler}
 */
export function createAudioScheduler({ generateBuffer, audioSettings, audioEngine }) {
  let currentBlockOffset = 0;

  function getSecondsPerBar() {
    return (60.0 / audioSettings.bpm) * 4;
  }

  /**
   * Generate the initial buffer at offset 0
   * @returns {Promise<Float32Array>}
   */
  async function requestInitialBuffer() {
    currentBlockOffset = 0;
    const buffer = await generateBuffer(0);
    return buffer;
  }

  /**
   * Advance block offset and generate next buffer
   * Sends the buffer directly to the AudioEngine worklet
   */
  async function requestNextBuffer() {
    currentBlockOffset += getSecondsPerBar();
    const buffer = await generateBuffer(currentBlockOffset);
    audioEngine.sendNextBuffer(buffer);
  }

  function reset() {
    currentBlockOffset = 0;
  }

  function destroy() {
    reset();
  }

  return {
    requestInitialBuffer,
    requestNextBuffer,
    get blockOffset() { return currentBlockOffset; },
    reset,
    destroy,
  };
}
