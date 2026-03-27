/**
 * KeyboardController factory function
 * Manages keyboard shortcuts for playback, shader, and editor controls
 */

import { UI } from '../utils/consts.js';

// Tab order for cycling with [ and ]
const TAB_ORDER = [UI.EDITOR_TABS.MAIN, UI.EDITOR_TABS.UTILS];

/**
 * @param {Object} deps
 * @param {import('../controllers/PlaybackController.js')} deps.playbackController
 * @param {import('../controllers/ShaderController.js')} deps.shaderController
 * @param {import('../controllers/UIController.js')} deps.uiController
 * @param {import('../editor/Editor.js').Editor} deps.editor
 * @param {import('../ui/SettingsModal.js')} deps.settingsModal
 * @param {import('../ui/DebugOverlay.js')} deps.debugOverlay
 * @param {import('../state/HotkeySettings.js')} deps.hotkeySettings
 */
export function createKeyboardController({
  playbackController,
  shaderController,
  uiController,
  editor,
  settingsModal,
  debugOverlay,
  hotkeySettings,
}) {
  function switchTab(direction) {
    const currentIndex = TAB_ORDER.indexOf(editor.tab);
    const nextIndex = (currentIndex + direction + TAB_ORDER.length) % TAB_ORDER.length;
    editor.switchTab(TAB_ORDER[nextIndex]);
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      uiController.hideHelpModal();
      settingsModal.hide();
      return;
    }

    const modifierPressed = hotkeySettings.isModifierPressed(e);

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
        case '?':
        case '/':
          e.preventDefault();
          uiController.toggleHelpModal();
          break;
        case '[':
          e.preventDefault();
          switchTab(-1);
          break;
        case ']':
          e.preventDefault();
          switchTab(1);
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
