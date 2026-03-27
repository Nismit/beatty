/**
 * SettingsModal factory function
 * Manages the settings modal UI with tabs for shader load/export, audio, and hotkeys
 */

import {
  DEFAULT_SOUND_SHADER,
  DEFAULT_VISUAL_SHADER,
  DEMO_SOUND_SHADER,
} from '../gl/shader-templates.js';
import { EVENTS } from '../utils/consts.js';
import { saveShader } from '../utils/storage.js';

const SOUND_PRESETS = {
  default: { main: DEFAULT_SOUND_SHADER, utils: '' },
  demo: { main: DEMO_SOUND_SHADER, utils: '' },
};

const VISUAL_PRESETS = {
  default: { main: DEFAULT_VISUAL_SHADER, utils: '' },
};

/**
 * @param {Object} deps
 * @param {import('../state/EventBus.js').EventBus} deps.eventBus
 * @param {import('../editor/Editor.js').Editor} deps.editor
 * @param {import('../state/HotkeySettings.js')} deps.hotkeySettings
 * @param {function({ main: string, utils: string }, { main: string, utils: string }): void} deps.initShaders
 */
export function createSettingsModal({ eventBus, editor, hotkeySettings, initShaders }) {
  const cleanups = [];

  function getModal() {
    return document.getElementById('settingsModal');
  }

  function show() {
    const modal = getModal();
    if (modal) {
      modal.classList.add('visible');
    }
  }

  function hide() {
    const modal = getModal();
    if (modal) {
      modal.classList.remove('visible');
    }
  }

  function isVisible() {
    const modal = getModal();
    return modal?.classList.contains('visible') ?? false;
  }

  function switchTab(tabName) {
    const tabs = document.querySelectorAll('.settings-tab');
    const contents = document.querySelectorAll('.settings-tab-content');

    for (const tab of tabs) {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    }

    for (const content of contents) {
      content.classList.toggle('active', content.id === `tab-${tabName}`);
    }
  }

  function handleTabClick(e) {
    const tab = e.target.closest('.settings-tab');
    if (tab) {
      switchTab(tab.dataset.tab);
    }
  }

  function handleLoad() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Support both old format (soundCode/visualCode) and new format (soundMain/etc)
        const soundMain = data.soundMain ?? data.soundCode ?? '';
        const soundUtils = data.soundUtils ?? '';
        const visualMain = data.visualMain ?? data.visualCode ?? '';
        const visualUtils = data.visualUtils ?? '';

        if (!soundMain || !visualMain) {
          alert('Invalid shader file: missing sound or visual code');
          return;
        }

        // Update editor
        editor.setAllCodes({ soundMain, soundUtils, visualMain, visualUtils });

        // Save to LocalStorage
        saveShader('sound', soundMain, soundUtils);
        saveShader('visual', visualMain, visualUtils);

        // Compile and apply
        initShaders(
          { main: soundMain, utils: soundUtils },
          { main: visualMain, utils: visualUtils },
        );

        eventBus.emit(EVENTS.SHADER_IMPORTED, { data });
        hide();
      } catch {
        alert('Failed to load shader: Invalid JSON file');
      }
    });

    input.click();
  }

  function applySoundPreset(presetName) {
    const preset = SOUND_PRESETS[presetName];
    if (!preset) return;

    const { main, utils } = preset;
    const currentCodes = editor.getAllCodes();

    // Update editor (sound only)
    editor.setAllCodes({ soundMain: main, soundUtils: utils });

    // Save to LocalStorage
    saveShader('sound', main, utils);

    // Compile and apply (keep current visual)
    initShaders(
      { main, utils },
      { main: currentCodes.visualMain, utils: currentCodes.visualUtils },
    );

    hide();
  }

  function applyVisualPreset(presetName) {
    const preset = VISUAL_PRESETS[presetName];
    if (!preset) return;

    const { main, utils } = preset;
    const currentCodes = editor.getAllCodes();

    // Update editor (visual only)
    editor.setAllCodes({ visualMain: main, visualUtils: utils });

    // Save to LocalStorage
    saveShader('visual', main, utils);

    // Compile and apply (keep current sound)
    initShaders({ main: currentCodes.soundMain, utils: currentCodes.soundUtils }, { main, utils });

    hide();
  }

  function handleExport() {
    const codes = editor.getAllCodes();
    const data = {
      version: 2,
      name: 'Custom',
      soundMain: codes.soundMain,
      soundUtils: codes.soundUtils,
      visualMain: codes.visualMain,
      visualUtils: codes.visualUtils,
      exportedAt: Date.now(),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `beatty-shader-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  function renderHotkeySettings() {
    const modifiers = hotkeySettings.getModifiers();

    const ctrlCheckbox = document.getElementById('hotkeyCtrl');
    const shiftCheckbox = document.getElementById('hotkeyShift');
    const altCheckbox = document.getElementById('hotkeyAlt');
    const metaCheckbox = document.getElementById('hotkeyMeta');

    if (ctrlCheckbox) ctrlCheckbox.checked = modifiers.ctrl;
    if (shiftCheckbox) shiftCheckbox.checked = modifiers.shift;
    if (altCheckbox) altCheckbox.checked = modifiers.alt;
    if (metaCheckbox) metaCheckbox.checked = modifiers.meta;

    updateHotkeyPreview();
  }

  function updateHotkeyPreview() {
    const previewEl = document.getElementById('hotkeyPreview');
    if (previewEl) {
      previewEl.textContent = `${hotkeySettings.getDisplayString()} + P, C, A, V, M, I, D, ?`;
    }
  }

  function handleHotkeyChange() {
    const ctrlCheckbox = document.getElementById('hotkeyCtrl');
    const shiftCheckbox = document.getElementById('hotkeyShift');
    const altCheckbox = document.getElementById('hotkeyAlt');
    const metaCheckbox = document.getElementById('hotkeyMeta');

    const newModifiers = {
      ctrl: ctrlCheckbox?.checked ?? false,
      shift: shiftCheckbox?.checked ?? false,
      alt: altCheckbox?.checked ?? false,
      meta: metaCheckbox?.checked ?? false,
    };

    // At least one must be selected
    if (!newModifiers.ctrl && !newModifiers.shift && !newModifiers.alt && !newModifiers.meta) {
      alert('At least one modifier key must be selected.');
      renderHotkeySettings(); // Reset to current values
      return;
    }

    hotkeySettings.setModifiers(newModifiers);
    updateHotkeyPreview();
  }

  function handleHotkeyReset() {
    hotkeySettings.resetToDefault();
    renderHotkeySettings();
  }

  function init() {
    // Tab switching
    const tabContainer = document.querySelector('.settings-tabs');
    if (tabContainer) {
      tabContainer.addEventListener('click', handleTabClick);
      cleanups.push(() => tabContainer.removeEventListener('click', handleTabClick));
    }

    // Sound preset select
    const soundPresetSelect = document.getElementById('soundPresetSelect');
    if (soundPresetSelect) {
      const handler = (e) => {
        if (e.target.value) {
          applySoundPreset(e.target.value);
          e.target.value = ''; // Reset to placeholder
        }
      };
      soundPresetSelect.addEventListener('change', handler);
      cleanups.push(() => soundPresetSelect.removeEventListener('change', handler));
    }

    // Visual preset select
    const visualPresetSelect = document.getElementById('visualPresetSelect');
    if (visualPresetSelect) {
      const handler = (e) => {
        if (e.target.value) {
          applyVisualPreset(e.target.value);
          e.target.value = ''; // Reset to placeholder
        }
      };
      visualPresetSelect.addEventListener('change', handler);
      cleanups.push(() => visualPresetSelect.removeEventListener('change', handler));
    }

    // Load button
    const loadBtn = document.getElementById('shaderLoadBtn');
    if (loadBtn) {
      loadBtn.addEventListener('click', handleLoad);
      cleanups.push(() => loadBtn.removeEventListener('click', handleLoad));
    }

    // Export button
    const exportBtn = document.getElementById('shaderExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', handleExport);
      cleanups.push(() => exportBtn.removeEventListener('click', handleExport));
    }

    // Close button
    const closeBtn = document.getElementById('closeSettings');
    if (closeBtn) {
      closeBtn.addEventListener('click', hide);
      cleanups.push(() => closeBtn.removeEventListener('click', hide));
    }

    // Hotkey checkboxes
    const hotkeyCheckboxes = ['hotkeyCtrl', 'hotkeyShift', 'hotkeyAlt', 'hotkeyMeta'];
    for (const id of hotkeyCheckboxes) {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.addEventListener('change', handleHotkeyChange);
        cleanups.push(() => checkbox.removeEventListener('change', handleHotkeyChange));
      }
    }

    // Hotkey reset button
    const hotkeyResetBtn = document.getElementById('hotkeyResetBtn');
    if (hotkeyResetBtn) {
      hotkeyResetBtn.addEventListener('click', handleHotkeyReset);
      cleanups.push(() => hotkeyResetBtn.removeEventListener('click', handleHotkeyReset));
    }

    // Initial render of hotkey settings
    renderHotkeySettings();
  }

  function destroy() {
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups.length = 0;
  }

  return {
    show,
    hide,
    isVisible,
    init,
    destroy,
  };
}
