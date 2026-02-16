/**
 * KeyboardController factory function
 * Manages keyboard shortcuts for playback, shader, and editor controls
 */

/**
 * @param {Object} deps
 * @param {import('../controllers/PlaybackController.js')} deps.playbackController
 * @param {import('../controllers/ShaderController.js')} deps.shaderController
 * @param {import('../controllers/UIController.js')} deps.uiController
 * @param {import('../editor/Editor.js').Editor} deps.editor
 * @param {import('../ui/PresetModal.js')} deps.presetModal
 * @param {import('../ui/DebugOverlay.js')} deps.debugOverlay
 */
export function createKeyboardController({
  playbackController,
  shaderController,
  uiController,
  editor,
  presetModal,
  debugOverlay,
}) {
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      uiController.hideHelpModal();
      presetModal.hide();
      return;
    }

    if (e.ctrlKey) {
      switch (e.key) {
        case 'p':
          e.preventDefault();
          playbackController.togglePlayback();
          break;
        case 's':
          e.preventDefault();
          shaderController.compileShader();
          break;
        case 'r':
          e.preventDefault();
          shaderController.applyCompiledShader();
          break;
        case 't':
          e.preventDefault();
          editor.toggleVisibility();
          break;
        case 'e':
          e.preventDefault();
          editor.switchMode();
          break;
        case 'i':
          e.preventDefault();
          playbackController.resetPlayback();
          break;
        case 'g':
          e.preventDefault();
          presetModal.show();
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
