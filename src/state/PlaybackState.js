/**
 * PlaybackState factory function
 * Manages playback state and timing information
 *
 * @param {import('./EventBus.js').EventBus} eventBus - EventBus instance
 * @returns {PlaybackState}
 */

import { EVENTS } from '../utils/consts.js';

/**
 * @typedef {Object} PlaybackState
 * @property {boolean} isPlaying - Whether audio is currently playing
 * @property {boolean} isPaused - Whether audio is paused
 * @property {number} blockOffset - Current block offset for audio scheduling
 * @property {number} totalElapsedTime - Total elapsed playback time in seconds
 * @property {number} pausedReadPos - Read position when paused (in samples)
 * @property {function(boolean, boolean=): void} setPlaying - Set play state
 * @property {function(): void} reset - Reset all timing state
 * @property {function(number): void} advanceBlock - Advance block offset
 * @property {function(number): void} recordStartTime - Record playback start time
 * @property {function(number, number): void} recordPauseTime - Record pause time
 * @property {function(AudioContext | null): number} getCurrentTime - Get current playback time
 * @property {function(): void} destroy - Clean up
 */

/**
 * Creates a new PlaybackState instance
 * @param {import('./EventBus.js').EventBus} eventBus
 * @returns {PlaybackState}
 */
export function createPlaybackState(eventBus) {
  const state = {
    isPlaying: false,
    isPaused: false,
    blockOffset: 0,
    startTime: 0,
    totalElapsedTime: 0,
    pausedReadPos: 0,
  };

  function setPlaying(playing, paused = false) {
    state.isPlaying = playing;
    state.isPaused = paused;
    eventBus.emit(EVENTS.PLAY_STATE_CHANGED, { isPlaying: playing, isPaused: paused });
  }

  function advanceBlock(secondsPerBar) {
    state.blockOffset += secondsPerBar;
  }

  function recordStartTime(audioContextTime) {
    state.startTime = audioContextTime;
  }

  function recordPauseTime(audioContextTime, samplesPerBar) {
    if (state.startTime) {
      state.totalElapsedTime += audioContextTime - state.startTime;
    }

    const elapsedSamples = Math.floor(state.totalElapsedTime * 48000);
    state.pausedReadPos = elapsedSamples % samplesPerBar;
  }

  function getCurrentTime(audioContext) {
    if (!state.isPlaying || !audioContext) return state.totalElapsedTime;

    const elapsedSinceStart = audioContext.currentTime - state.startTime;
    return state.totalElapsedTime + elapsedSinceStart;
  }

  function reset() {
    state.isPlaying = false;
    state.isPaused = false;
    state.blockOffset = 0;
    state.startTime = 0;
    state.totalElapsedTime = 0;
    state.pausedReadPos = 0;
    eventBus.emit(EVENTS.PLAYBACK_RESET);
  }

  function destroy() {
    reset();
  }

  return {
    get isPlaying() { return state.isPlaying; },
    get isPaused() { return state.isPaused; },
    get blockOffset() { return state.blockOffset; },
    get totalElapsedTime() { return state.totalElapsedTime; },
    get pausedReadPos() { return state.pausedReadPos; },

    setPlaying,
    advanceBlock,
    recordStartTime,
    recordPauseTime,
    getCurrentTime,
    reset,
    destroy,
  };
}
