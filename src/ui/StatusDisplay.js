/**
 * StatusDisplay factory function
 * Handles all DOM updates for status information (BPM, volume, play state, bars, status line)
 * Subscribes to EventBus events for automatic UI synchronization
 */

import { APP, EVENTS, UI } from '../utils/consts.js';

/**
 * @typedef {Object} StatusDisplay
 * @property {function(): void} init - Initialize displays with current values
 * @property {function(string, string=): void} showStatus - Show status message
 * @property {function(string): void} showError - Show error message
 * @property {function(): void} startUpdates - Start periodic status updates
 * @property {function(): void} stopUpdates - Stop periodic status updates
 * @property {function(): void} destroy - Clean up
 */

/**
 * Creates a new StatusDisplay instance
 * @param {Object} deps
 * @param {import('../state/EventBus.js').EventBus} deps.eventBus
 * @param {import('../state/PlaybackState.js').PlaybackState} deps.playbackState
 * @param {import('../state/AudioSettings.js').AudioSettings} deps.audioSettings
 * @param {function(AudioContext | null): number} deps.getCurrentTime - Function to get current playback time
 * @returns {StatusDisplay}
 */
export function createStatusDisplay({ eventBus, playbackState, audioSettings, getCurrentTime }) {
  let statusUpdateInterval = null;

  // Event subscriptions
  const unsubscribers = [
    eventBus.on(EVENTS.BPM_CHANGED, ({ new: newBpm }) => updateBpmDisplay(newBpm)),
    eventBus.on(EVENTS.VOLUME_CHANGED, ({ new: newVolume }) => updateVolumeDisplay(newVolume)),
    eventBus.on(EVENTS.PLAY_STATE_CHANGED, (state) => updatePlayStateDisplay(state)),
  ];

  function updateBpmDisplay(bpm) {
    setTextContent('bpmValue', bpm);
    setTextContent('statusBpm', bpm);

    const slider = document.getElementById('bpmSlider');
    if (slider) slider.value = bpm;
  }

  function updateVolumeDisplay(volume) {
    const text = volume.toFixed(1);
    setTextContent('volumeValue', text);
    setTextContent('statusVolume', text);

    const slider = document.getElementById('volumeSlider');
    if (slider) slider.value = volume;
  }

  function updatePlayStateDisplay({ isPlaying, isPaused }) {
    const el = document.getElementById('statusPlayState');
    if (!el) return;

    if (isPlaying) {
      el.textContent = 'PLAY';
      el.className = 'status-playing';
    } else if (isPaused) {
      el.textContent = 'PAUSED';
      el.className = 'status-paused';
    } else {
      el.textContent = 'PAUSE';
      el.className = 'status-paused';
    }
  }

  function updateBarsDisplay() {
    if (!playbackState.isPlaying) return;

    const currentTime = getCurrentTime();
    const beatsPerSecond = audioSettings.bpm / 60;
    const barsElapsed = (currentTime * beatsPerSecond) / 4;

    setTextContent('statusBars', barsElapsed.toFixed(0));
  }

  function showStatus(message, type = UI.STATUS_TYPES.READY) {
    const el = document.getElementById('statusText');
    if (el) {
      el.textContent = message;
      el.className = `status-${type}`;
    }
  }

  function showError(message) {
    showStatus(message, UI.STATUS_TYPES.ERROR);
  }

  function init() {
    updateBpmDisplay(audioSettings.bpm);
    updateVolumeDisplay(audioSettings.volume);
    updatePlayStateDisplay({
      isPlaying: playbackState.isPlaying,
      isPaused: playbackState.isPaused,
    });
  }

  function startUpdates() {
    stopUpdates();
    statusUpdateInterval = setInterval(() => {
      updateBarsDisplay();
    }, APP.STATUS_UPDATE_INTERVAL);
  }

  function stopUpdates() {
    if (statusUpdateInterval) {
      clearInterval(statusUpdateInterval);
      statusUpdateInterval = null;
    }
  }

  function destroy() {
    stopUpdates();
    for (const unsub of unsubscribers) {
      unsub();
    }
  }

  /**
   * Helper to set textContent of an element by ID
   * @param {string} id
   * @param {string | number} text
   */
  function setTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  return {
    init,
    showStatus,
    showError,
    startUpdates,
    stopUpdates,
    destroy,
  };
}
