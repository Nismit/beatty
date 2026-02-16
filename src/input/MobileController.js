/**
 * MobileController factory function
 * Manages mobile button controls and slider inputs (BPM/Volume)
 */

import { EVENTS } from '../utils/consts.js';

/**
 * @param {Object} deps
 * @param {import('../controllers/PlaybackController.js')} deps.playbackController
 * @param {import('../controllers/ShaderController.js')} deps.shaderController
 * @param {import('../controllers/UIController.js')} deps.uiController
 * @param {import('../editor/Editor.js').Editor} deps.editor
 * @param {import('../state/AudioSettings.js').AudioSettings} deps.audioSettings
 * @param {import('../audio/AudioEngine.js').AudioEngine} deps.audioEngine
 * @param {import('../state/EventBus.js').EventBus} deps.eventBus
 * @param {import('../ui/PresetModal.js')} deps.presetModal
 */
export function createMobileController({
  playbackController,
  shaderController,
  uiController,
  editor,
  audioSettings,
  audioEngine,
  eventBus,
  presetModal,
}) {
  const cleanups = [];
  let isCompiled = false;

  /**
   * Bind a click handler to an element by ID
   * @param {string} id
   * @param {function(Event): void} handler
   */
  function bindClick(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', handler);
    cleanups.push(() => el.removeEventListener('click', handler));
  }

  /**
   * Bind an input handler to an element by ID
   * @param {string} id
   * @param {function(Event): void} handler
   */
  function bindInput(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', handler);
    cleanups.push(() => el.removeEventListener('input', handler));
  }

  function updateCompileApplyButton() {
    const btn = document.getElementById('mobileCompileApply');
    if (!btn) return;

    if (isCompiled) {
      btn.textContent = '✓';
      btn.title = 'Apply (⌘R)';
    } else {
      btn.textContent = '⚙';
      btn.title = 'Compile (⌘S)';
    }
  }

  function init() {
    // Mobile buttons
    bindClick('mobilePlayToggle', (e) => {
      e.preventDefault();
      playbackController.togglePlayback();
    });

    bindClick('mobileReset', (e) => {
      e.preventDefault();
      playbackController.resetPlayback();
    });

    bindClick('mobileCompileApply', (e) => {
      e.preventDefault();
      if (isCompiled) {
        shaderController.applyCompiledShader();
      } else {
        shaderController.compileShader();
      }
    });

    bindClick('mobileToggleEditor', (e) => {
      e.preventDefault();
      editor.toggleVisibility();
    });

    bindClick('mobileToggleMode', (e) => {
      e.preventDefault();
      editor.switchMode();
    });

    bindClick('mobileHelp', (e) => {
      e.preventDefault();
      uiController.showHelpModal();
    });

    bindClick('mobilePresets', (e) => {
      e.preventDefault();
      presetModal.show();
    });

    // Sliders
    bindInput('bpmSlider', (e) => {
      audioSettings.setBpm(parseInt(e.target.value, 10));
    });

    bindInput('volumeSlider', (e) => {
      const volume = parseFloat(e.target.value);
      audioSettings.setVolume(volume);
      audioEngine.setVolume(volume);
    });

    // Subscribe to shader events
    const unsubCompileSuccess = eventBus.on(EVENTS.SHADER_COMPILE_SUCCESS, () => {
      isCompiled = true;
      updateCompileApplyButton();
    });
    cleanups.push(unsubCompileSuccess);

    const unsubCompileError = eventBus.on(EVENTS.SHADER_COMPILE_ERROR, () => {
      isCompiled = false;
      updateCompileApplyButton();
    });
    cleanups.push(unsubCompileError);

    const unsubApplied = eventBus.on(EVENTS.SHADER_APPLIED, () => {
      isCompiled = false;
      updateCompileApplyButton();
    });
    cleanups.push(unsubApplied);

    // Initialize button states
    uiController.initButtonStates();
  }

  function destroy() {
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups.length = 0;
  }

  return { init, destroy };
}
