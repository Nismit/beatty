/**
 * StatusDisplay factory function
 * Handles all DOM updates for status information (BPM, volume, bars, status line)
 * Subscribes to EventBus events for automatic UI synchronization
 */

import { APP, EVENTS, UI } from '../utils/consts.js';

/**
 * @typedef {Object} StatusDisplay
 * @property {function(): void} init - Initialize displays with current values
 * @property {function(string, string=): void} showStatus - Show status message
 * @property {function(string): void} showError - Show error message in error bar
 * @property {function(): void} clearError - Clear error bar
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
  ];

  function updateBpmDisplay(bpm) {
    setTextContent('bpmValue', bpm);
    setTextContent('statusBpm', bpm);

    const slider = document.getElementById('bpmSlider');
    if (slider) slider.value = bpm;
  }

  function updateVolumeDisplay(volume) {
    const percent = Math.round(volume * 100) + '%';
    setTextContent('volumeValue', percent);
    setTextContent('statusVolume', Math.round(volume * 100));

    const slider = document.getElementById('volumeSlider');
    if (slider) slider.value = volume;
  }

  function updateBarsDisplay() {
    if (!playbackState.isPlaying) return;

    const currentTime = getCurrentTime();
    const beatsPerSecond = audioSettings.bpm / 60;
    const barsElapsed = (currentTime * beatsPerSecond) / 4;

    setTextContent('statusBars', barsElapsed.toFixed(0));
  }

  function showStatus(message, type = UI.STATUS_TYPES.READY) {
    const dot = document.getElementById('statusDot');
    if (dot) {
      dot.classList.remove('initializing', 'ready', 'compiling', 'compiled', 'applied', 'error');
      dot.classList.add(type);
    }
    // Clear error bar on non-error status
    if (type !== UI.STATUS_TYPES.ERROR) {
      clearError();
    }
  }

  function showError(message) {
    showStatus(null, UI.STATUS_TYPES.ERROR);
    const errorBar = document.getElementById('errorBar');
    if (errorBar) {
      errorBar.textContent = message;
      errorBar.classList.add('visible');
    }
  }

  function clearError() {
    const errorBar = document.getElementById('errorBar');
    if (errorBar) {
      errorBar.classList.remove('visible');
      errorBar.textContent = '';
    }
  }

  function init() {
    updateBpmDisplay(audioSettings.bpm);
    updateVolumeDisplay(audioSettings.volume);
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
    clearError,
    startUpdates,
    stopUpdates,
    destroy,
  };
}
