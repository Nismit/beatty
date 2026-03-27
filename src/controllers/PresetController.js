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
 * @param {function({ main: string, utils: string }, { main: string, utils: string }): void} deps.initShaders
 * @param {import('../state/EventBus.js').EventBus} deps.eventBus
 */
export function createPresetController({ editor, initShaders, eventBus }) {
  /**
   * Load a preset by ID into the editor and compile
   * Handles both old format (soundCode/visualCode) and new format (soundMain/soundUtils/etc)
   * @param {string} presetId - Preset ID to load
   * @returns {{ success: boolean, error?: string }}
   */
  function loadPreset(presetId) {
    const preset = getPresetById(presetId);
    if (!preset) {
      return { success: false, error: 'Preset not found' };
    }

    // Handle both old and new preset formats
    const soundMain = preset.soundMain ?? preset.soundCode ?? '';
    const soundUtils = preset.soundUtils ?? '';
    const visualMain = preset.visualMain ?? preset.visualCode ?? '';
    const visualUtils = preset.visualUtils ?? '';

    // Update editor with preset code
    editor.setAllCodes({ soundMain, soundUtils, visualMain, visualUtils });

    // Save to LocalStorage for persistence
    saveShader('sound', soundMain, soundUtils);
    saveShader('visual', visualMain, visualUtils);

    // Compile and apply shaders
    initShaders({ main: soundMain, utils: soundUtils }, { main: visualMain, utils: visualUtils });

    // Emit event
    eventBus.emit(EVENTS.PRESET_LOADED, { preset });

    return { success: true };
  }

  function destroy() {
    // No cleanup needed
  }

  return { loadPreset, destroy };
}
