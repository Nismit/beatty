/**
 * UIController factory function
 * Manages button states, slider popups, and help modal
 */

import { EVENTS, UI } from '../utils/consts.js';

/**
 * @param {Object} deps
 * @param {import('../state/PlaybackState.js').PlaybackState} deps.playbackState
 * @param {import('../state/AudioSettings.js').AudioSettings} deps.audioSettings
 * @param {import('../editor/Editor.js').Editor} deps.editor
 * @param {import('../state/EventBus.js').EventBus} deps.eventBus
 */
export function createUIController({ playbackState, audioSettings, editor, eventBus }) {
  // Subscribe to state changes for automatic UI updates
  const unsubscribers = [
    eventBus.on(EVENTS.PLAY_STATE_CHANGED, () => updatePlayButton()),
    eventBus.on(EVENTS.EDITOR_MODE_CHANGED, () => {
      updateModeButton();
      updateModeIndicator();
    }),
    eventBus.on(EVENTS.EDITOR_VISIBILITY_CHANGED, () => updateEditorButton()),
  ];

  function updatePlayButton() {
    const btn = document.getElementById('mobilePlayToggle');
    if (!btn) return;

    if (playbackState.isPlaying) {
      btn.classList.add('active');
      btn.textContent = '\u23F8';
      btn.title = 'Pause';
    } else {
      btn.classList.remove('active');
      btn.textContent = '\u25B6';
      btn.title = 'Play';
    }
  }

  function updateEditorButton() {
    const btn = document.getElementById('mobileToggleEditor');
    if (!btn) return;

    if (editor.isVisible) {
      btn.classList.add('active');
      btn.textContent = '\uD83D\uDC41';
      btn.title = 'Hide Editor';
    } else {
      btn.classList.remove('active');
      btn.textContent = '\uD83D\uDCDD';
      btn.title = 'Show Editor';
    }
  }

  function updateModeButton() {
    const btn = document.getElementById('mobileToggleMode');
    if (!btn) return;

    if (editor.mode === UI.EDITOR_MODES.SOUND) {
      btn.textContent = '\uD83C\uDFB5';
      btn.title = 'Switch to Visual Mode';
    } else {
      btn.textContent = '\uD83C\uDFA8';
      btn.title = 'Switch to Sound Mode';
    }
  }

  function updateModeIndicator() {
    const statusLine = document.getElementById('statusLine');
    if (!statusLine) return;

    statusLine.classList.remove('sound', 'visual');
    statusLine.classList.add(editor.mode);
  }

  /**
   * Show a slider popup (BPM or Volume)
   * @param {'bpm' | 'volume'} type
   * @param {Event} event
   */
  function showSliderPopup(type, event) {
    hideAllSliderPopups();

    const popup = document.getElementById(`${type}SliderPopup`);
    const slider = document.getElementById(`${type}Slider`);
    const valueDisplay = document.getElementById(`${type}Value`);

    if (!popup || !slider) return;

    if (type === 'bpm') {
      slider.value = audioSettings.bpm;
      if (valueDisplay) valueDisplay.textContent = audioSettings.bpm;
    } else {
      slider.value = audioSettings.volume;
      if (valueDisplay) valueDisplay.textContent = `${Math.round(audioSettings.volume * 100)}%`;
    }

    const rect = event.target.getBoundingClientRect();
    popup.style.left = `${rect.left}px`;
    popup.style.top = `${rect.bottom + 8}px`;
    popup.classList.add('visible');
  }

  function hideAllSliderPopups() {
    for (const id of ['bpmSliderPopup', 'volumeSliderPopup']) {
      const popup = document.getElementById(id);
      if (popup) popup.classList.remove('visible');
    }
  }

  function showHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
      modal.classList.add('visible');
      document.getElementById('closeHelp')?.focus();
    }
  }

  function hideHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) modal.classList.remove('visible');
  }

  /**
   * Initialize all button states
   */
  function initButtonStates() {
    updatePlayButton();
    updateEditorButton();
    updateModeButton();
    updateModeIndicator();
  }

  function destroy() {
    for (const unsub of unsubscribers) {
      unsub();
    }
  }

  return {
    updatePlayButton,
    updateEditorButton,
    updateModeButton,
    updateModeIndicator,
    showSliderPopup,
    hideAllSliderPopups,
    showHelpModal,
    hideHelpModal,
    initButtonStates,
    destroy,
  };
}
