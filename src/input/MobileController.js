/**
 * MobileController factory function
 * Manages mobile button controls and slider inputs (BPM/Volume)
 */

/**
 * @param {Object} deps
 * @param {import('../controllers/PlaybackController-new.js')} deps.playbackController
 * @param {import('../controllers/ShaderController-new.js')} deps.shaderController
 * @param {import('../controllers/UIController-new.js')} deps.uiController
 * @param {import('../editor/Editor-new.js').Editor} deps.editor
 * @param {import('../state/AudioSettings.js').AudioSettings} deps.audioSettings
 * @param {import('../audio/AudioEngine.js').AudioEngine} deps.audioEngine
 */
export function createMobileController({
  playbackController,
  shaderController,
  uiController,
  editor,
  audioSettings,
  audioEngine,
}) {
  const cleanups = [];

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

    bindClick('mobileCompile', (e) => {
      e.preventDefault();
      shaderController.compileShader();
    });

    bindClick('mobileApply', (e) => {
      e.preventDefault();
      shaderController.applyCompiledShader();
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

    // Sliders
    bindInput('bpmSlider', (e) => {
      audioSettings.setBpm(parseInt(e.target.value, 10));
    });

    bindInput('volumeSlider', (e) => {
      const volume = parseFloat(e.target.value);
      audioSettings.setVolume(volume);
      audioEngine.setVolume(volume);
    });

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
