/**
 * PresetController factory function
 * Manages loading presets into the editor and triggering shader compilation
 */

import { EVENTS } from '../utils/consts.js';
import { getPresetById } from '../utils/presets.js';
import { saveShader } from '../utils/storage.js';

/**
 * @param {Object} deps
 * @param {import('../editor/Editor.js').Editor} deps.editor
 * @param {function(string, string): void} deps.initShaders - ShaderController.initShaders
 * @param {import('../state/EventBus.js').EventBus} deps.eventBus
 */
export function createPresetController({ editor, initShaders, eventBus }) {
  /**
   * Load a preset by ID into the editor and compile
   * @param {string} presetId - Preset ID to load
   * @returns {{ success: boolean, error?: string }}
   */
  function loadPreset(presetId) {
    const preset = getPresetById(presetId);
    if (!preset) {
      return { success: false, error: 'Preset not found' };
    }

    // Update editor with preset code
    editor.setCode('sound', preset.soundCode);
    editor.setCode('visual', preset.visualCode);

    // Save to LocalStorage for persistence
    saveShader('sound', preset.soundCode);
    saveShader('visual', preset.visualCode);

    // Compile and apply shaders
    initShaders(preset.soundCode, preset.visualCode);

    // Emit event
    eventBus.emit(EVENTS.PRESET_LOADED, { preset });

    return { success: true };
  }

  function destroy() {
    // No cleanup needed
  }

  return { loadPreset, destroy };
}
