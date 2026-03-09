/**
 * ToolbarController factory function
 * Manages toolbar interactions (load, export, settings, help)
 */

import { EVENTS } from '../utils/consts.js';

/**
 * @param {Object} deps
 * @param {import('../editor/Editor.js').Editor} deps.editor
 * @param {import('../controllers/UIController.js').UIController} deps.uiController
 * @param {import('./SettingsModal.js')} deps.settingsModal
 * @param {import('../state/EventBus.js').EventBus} deps.eventBus
 */
export function createToolbarController({ editor, uiController, settingsModal, eventBus }) {
  function init() {
    const loadBtn = document.getElementById('toolbarLoad');
    const exportBtn = document.getElementById('toolbarExport');
    const settingsBtn = document.getElementById('toolbarSettings');
    const helpBtn = document.getElementById('toolbarHelp');

    if (loadBtn) {
      loadBtn.addEventListener('click', handleLoad);
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', handleExport);
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', handleSettings);
    }

    if (helpBtn) {
      helpBtn.addEventListener('click', handleHelp);
    }
  }

  function handleLoad() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);

          if (data.soundCode && data.visualCode) {
            editor.setCode('sound', data.soundCode);
            editor.setCode('visual', data.visualCode);
            eventBus.emit(EVENTS.SHADER_IMPORTED, { data });
          } else {
            console.error('[Toolbar] Invalid shader file format');
          }
        } catch (error) {
          console.error('[Toolbar] Failed to parse JSON:', error);
        }
      };
      reader.readAsText(file);
    });

    input.click();
  }

  function handleExport() {
    const { soundCode, visualCode } = editor.getAllCodes();
    const data = {
      version: 1,
      name: 'Custom',
      soundCode,
      visualCode,
      exportedAt: Date.now(),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `beatty-shader-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function handleSettings() {
    settingsModal.show();
  }

  function handleHelp() {
    uiController.showHelpModal();
  }

  function destroy() {
    // Cleanup if needed
  }

  return { init, destroy };
}
