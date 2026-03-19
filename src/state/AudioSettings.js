/**
 * AudioSettings factory function
 * Manages BPM, volume, and sample rate with persistence via LocalStorage
 *
 * @param {import('./EventBus.js').EventBus} eventBus - EventBus instance
 * @param {Object} [options] - Optional configuration
 * @param {function(): boolean} [options.isPlayingCheck] - Function to check if audio is playing
 * @returns {AudioSettings}
 */

import { AUDIO, EVENTS } from '../utils/consts.js';
import { loadSettings, saveSettings } from '../utils/storage.js';

/**
 * @typedef {Object} AudioSettings
 * @property {number} bpm - Current BPM
 * @property {number} volume - Current volume (0-1)
 * @property {number} sampleRate - Audio sample rate
 * @property {function(number): boolean} setBpm - Set BPM, returns false if blocked
 * @property {function(number): void} setVolume - Set volume
 * @property {function(number): void} setSampleRate - Set sample rate
 * @property {function(): number} getSamplesPerBar - Get samples per bar
 * @property {function(): void} destroy - Clean up
 */

/**
 * Creates a new AudioSettings instance
 * @param {import('./EventBus.js').EventBus} eventBus
 * @param {Object} [options]
 * @param {function(): boolean} [options.isPlayingCheck]
 * @returns {AudioSettings}
 */
export function createAudioSettings(eventBus, options = {}) {
  const { isPlayingCheck = () => false } = options;
  const saved = loadSettings();

  const state = {
    bpm: saved?.bpm ?? AUDIO.DEFAULT_BPM,
    volume: saved?.volume ?? AUDIO.DEFAULT_VOLUME,
    sampleRate: AUDIO.SAMPLE_RATE,
  };

  function persist() {
    saveSettings({ bpm: state.bpm, volume: state.volume });
  }

  function setBpm(newBpm) {
    if (typeof newBpm !== 'number' || Number.isNaN(newBpm)) {
      throw new TypeError('BPM must be a number');
    }

    const clamped = Math.max(20, Math.min(300, newBpm));
    if (clamped === state.bpm) return true; // No change

    const oldBpm = state.bpm;
    const wasPlaying = isPlayingCheck();
    state.bpm = clamped;
    eventBus.emit(EVENTS.BPM_CHANGED, { old: oldBpm, new: clamped, wasPlaying });
    persist();
    return true;
  }

  function setVolume(newVolume) {
    if (typeof newVolume !== 'number' || Number.isNaN(newVolume)) {
      throw new TypeError('Volume must be a number');
    }
    const clamped = Math.max(0, Math.min(1, newVolume));
    const oldVolume = state.volume;
    state.volume = clamped;
    eventBus.emit(EVENTS.VOLUME_CHANGED, { old: oldVolume, new: clamped });
    persist();
  }

  function setSampleRate(newSampleRate) {
    if (typeof newSampleRate !== 'number' || Number.isNaN(newSampleRate)) {
      throw new TypeError('Sample rate must be a number');
    }
    if (!Number.isInteger(newSampleRate) || newSampleRate <= 0) {
      throw new RangeError('Sample rate must be a positive integer');
    }
    state.sampleRate = newSampleRate;
  }

  function getSamplesPerBar() {
    return Math.floor((AUDIO.SAMPLES_PER_BAR_MULTIPLIER * state.sampleRate) / state.bpm);
  }

  function destroy() {
    // No listeners to clean up; state is garbage collected
  }

  return {
    get bpm() {
      return state.bpm;
    },
    get volume() {
      return state.volume;
    },
    get sampleRate() {
      return state.sampleRate;
    },

    setBpm,
    setVolume,
    setSampleRate,
    getSamplesPerBar,
    destroy,
  };
}
