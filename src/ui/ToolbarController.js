/**
 * ToolbarController factory function
 * Manages toolbar interactions (preset select, load, export, mode, help)
 */

import { EVENTS } from '../utils/consts.js';
import { getAllPresets } from '../utils/presets.js';

/**
 * @param {Object} deps
 * @param {import('../editor/Editor.js').Editor} deps.editor
 * @param {import('../controllers/PresetController.js').PresetController} deps.presetController
 * @param {import('../controllers/UIController.js').UIController} deps.uiController
 * @param {import('../state/EventBus.js').EventBus} deps.eventBus
 */
export function createToolbarController({ editor, presetController, uiController, eventBus }) {
  let presetSelect = null;

  function init() {
    presetSelect = document.getElementById('presetSelect');
    const loadBtn = document.getElementById('toolbarLoad');
    const exportBtn = document.getElementById('toolbarExport');
    const settingsBtn = document.getElementById('toolbarSettings');
    const helpBtn = document.getElementById('toolbarHelp');

    if (presetSelect) {
      populatePresetSelect();
      presetSelect.addEventListener('change', handlePresetChange);
    }

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

    // Listen for preset loaded events to update select
    eventBus.on(EVENTS.PRESET_LOADED, updatePresetSelect);
  }

  function populatePresetSelect() {
    if (!presetSelect) return;

    const presets = getAllPresets();
    presetSelect.innerHTML = '';

    for (const preset of presets) {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.name;
      if (preset.isBuiltIn) {
        option.classList.add('preset-builtin');
      }
      presetSelect.appendChild(option);
    }
  }

  function updatePresetSelect({ preset }) {
    if (presetSelect && preset) {
      presetSelect.value = preset.id;
    }
  }

  function handlePresetChange(e) {
    const presetId = e.target.value;
    presetController.loadPreset(presetId);
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
    // TODO: Settings modal (placeholder for now)
    console.log('[Toolbar] Settings button clicked');
  }

  function handleHelp() {
    uiController.showHelpModal();
  }

  function destroy() {
    if (presetSelect) {
      presetSelect.removeEventListener('change', handlePresetChange);
    }
  }

  return { init, populatePresetSelect, destroy };
}
