/**
 * PresetModal factory function
 * Manages the preset modal UI for saving, loading, importing, and exporting presets
 */

import { EVENTS, PRESET } from '../utils/consts.js';
import {
  canSaveMorePresets,
  createPreset,
  deletePreset,
  exportPreset,
  getAllPresets,
  importPreset,
} from '../utils/presets.js';

/**
 * @param {Object} deps
 * @param {import('../state/EventBus.js').EventBus} deps.eventBus
 * @param {import('../editor/Editor.js').Editor} deps.editor
 * @param {function(string): void} deps.onLoad - Callback when preset is loaded
 */
export function createPresetModal({ eventBus, editor, onLoad }) {
  const cleanups = [];

  function getModal() {
    return document.getElementById('presetModal');
  }

  function show() {
    const modal = getModal();
    if (modal) {
      renderPresetList();
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

  function renderPresetList() {
    const listEl = document.getElementById('presetList');
    if (!listEl) return;

    const presets = getAllPresets();
    listEl.innerHTML = '';

    for (const preset of presets) {
      const item = document.createElement('div');
      item.className = 'preset-item';
      item.dataset.presetId = preset.id;

      const nameEl = document.createElement('span');
      nameEl.className = 'preset-name';
      nameEl.textContent = preset.name;
      if (preset.isDefault) {
        nameEl.classList.add('default');
      }
      item.appendChild(nameEl);

      const actionsEl = document.createElement('div');
      actionsEl.className = 'preset-actions';

      // Load button
      const loadBtn = document.createElement('button');
      loadBtn.className = 'preset-btn load';
      loadBtn.textContent = 'Load';
      loadBtn.title = 'Load this preset';
      loadBtn.addEventListener('click', () => handleLoad(preset.id));
      actionsEl.appendChild(loadBtn);

      // Export button
      const exportBtn = document.createElement('button');
      exportBtn.className = 'preset-btn export';
      exportBtn.textContent = 'Export';
      exportBtn.title = 'Export to JSON file';
      exportBtn.addEventListener('click', () => handleExport(preset.id, preset.name));
      actionsEl.appendChild(exportBtn);

      // Delete button (not for default)
      if (!preset.isDefault) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'preset-btn delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.title = 'Delete this preset';
        deleteBtn.addEventListener('click', () => handleDelete(preset.id, preset.name));
        actionsEl.appendChild(deleteBtn);
      }

      item.appendChild(actionsEl);
      listEl.appendChild(item);
    }

    // Update save button state
    updateSaveButtonState();
  }

  function updateSaveButtonState() {
    const saveBtn = document.getElementById('presetSaveBtn');
    if (!saveBtn) return;

    if (canSaveMorePresets()) {
      saveBtn.disabled = false;
      saveBtn.title = 'Save current shader code as a preset';
    } else {
      saveBtn.disabled = true;
      saveBtn.title = `Maximum ${PRESET.MAX_COUNT} presets reached`;
    }
  }

  function handleSave() {
    if (!canSaveMorePresets()) {
      alert(`Maximum ${PRESET.MAX_COUNT} presets reached. Delete some presets first.`);
      return;
    }

    const name = window.prompt('Enter preset name:');
    if (!name) return;

    const codes = editor.getAllCodes();
    const result = createPreset(name, codes.soundCode, codes.visualCode);

    if (result.success) {
      eventBus.emit(EVENTS.PRESET_SAVED, { preset: result.preset });
      renderPresetList();
    } else {
      alert(result.error);
    }
  }

  function handleLoad(presetId) {
    onLoad(presetId);
    hide();
  }

  function handleExport(presetId, presetName) {
    const result = exportPreset(presetId);
    if (!result.success) {
      alert(result.error);
      return;
    }

    const blob = new Blob([JSON.stringify(result.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${presetName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleDelete(presetId, presetName) {
    if (!window.confirm(`Delete preset "${presetName}"?`)) {
      return;
    }

    const result = deletePreset(presetId);
    if (result.success) {
      eventBus.emit(EVENTS.PRESET_DELETED, { id: presetId });
      renderPresetList();
    } else {
      alert(result.error);
    }
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = importPreset(data);

        if (result.success) {
          eventBus.emit(EVENTS.PRESET_IMPORTED, { preset: result.preset });
          renderPresetList();
        } else {
          alert(result.error);
        }
      } catch {
        alert('Failed to import preset: Invalid JSON file');
      }
    });

    input.click();
  }

  function init() {
    // Save button
    const saveBtn = document.getElementById('presetSaveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', handleSave);
      cleanups.push(() => saveBtn.removeEventListener('click', handleSave));
    }

    // Import button
    const importBtn = document.getElementById('presetImportBtn');
    if (importBtn) {
      importBtn.addEventListener('click', handleImport);
      cleanups.push(() => importBtn.removeEventListener('click', handleImport));
    }

    // Close button
    const closeBtn = document.getElementById('closePreset');
    if (closeBtn) {
      closeBtn.addEventListener('click', hide);
      cleanups.push(() => closeBtn.removeEventListener('click', hide));
    }
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
