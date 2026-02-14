/**
 * KeyboardController factory function
 * Manages keyboard shortcuts for playback, shader, and editor controls
 */

/**
 * @param {Object} deps
 * @param {import('../controllers/PlaybackController-new.js')} deps.playbackController
 * @param {import('../controllers/ShaderController-new.js')} deps.shaderController
 * @param {import('../controllers/UIController-new.js')} deps.uiController
 * @param {import('../editor/Editor-new.js').Editor} deps.editor
 */
export function createKeyboardController({ playbackController, shaderController, uiController, editor }) {
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      uiController.hideHelpModal();
      return;
    }

    if (e.ctrlKey || e.metaKey) {
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
