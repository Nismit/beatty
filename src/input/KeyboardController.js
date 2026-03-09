/**
 * KeyboardController factory function
 * Manages keyboard shortcuts for playback, shader, and editor controls
 */

const isMac = navigator.userAgent.includes('Mac');

/**
 * @param {Object} deps
 * @param {import('../controllers/PlaybackController.js')} deps.playbackController
 * @param {import('../controllers/ShaderController.js')} deps.shaderController
 * @param {import('../controllers/UIController.js')} deps.uiController
 * @param {import('../editor/Editor.js').Editor} deps.editor
 * @param {import('../ui/SettingsModal.js')} deps.settingsModal
 * @param {import('../ui/DebugOverlay.js')} deps.debugOverlay
 */
export function createKeyboardController({
  playbackController,
  shaderController,
  uiController,
  editor,
  settingsModal,
  debugOverlay,
}) {
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      uiController.hideHelpModal();
      settingsModal.hide();
      return;
    }

    const modifierPressed = isMac ? e.ctrlKey : e.ctrlKey && e.shiftKey;

    if (modifierPressed) {
      switch (e.key.toLowerCase()) {
        case 'p':
          e.preventDefault();
          playbackController.togglePlayback();
          break;
        case 'c':
          e.preventDefault();
          shaderController.compileShader();
          break;
        case 'a':
          e.preventDefault();
          shaderController.applyCompiledShader();
          break;
        case 'v':
          e.preventDefault();
          editor.toggleVisibility();
          break;
        case 'm':
          e.preventDefault();
          editor.switchMode();
          break;
        case 'i':
          e.preventDefault();
          playbackController.resetPlayback();
          break;
        case 'd':
          e.preventDefault();
          debugOverlay.toggle();
          break;
      }
    }
  }

  function init() {
    document.addEventListener('keydown', handleKeydown);
  }

  function destroy() {
    document.removeEventListener('keydown', handleKeydown);
  }

  return { init, destroy };
}
