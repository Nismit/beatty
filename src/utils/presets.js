/**
 * Preset utilities for shader preset management
 * Provides pure functions for CRUD operations on presets
 */

import {
  DEFAULT_SOUND_SHADER,
  DEFAULT_VISUAL_SHADER,
  DEMO_SOUND_SHADER,
} from '../gl/shader-templates.js';
import { PRESET, STORAGE_KEYS } from './consts.js';

/**
 * Generate a UUID v4
 * @returns {string}
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Load presets from LocalStorage
 * @returns {Array<Object>} Array of preset objects
 */
export function loadPresets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (!stored) {
      return [];
    }

    const data = JSON.parse(stored);
    if (!Array.isArray(data.presets)) {
      console.warn('[Presets] Invalid presets data, clearing');
      localStorage.removeItem(STORAGE_KEYS.PRESETS);
      return [];
    }

    return data.presets;
  } catch (error) {
    console.error('[Presets] Failed to load presets:', error);
    return [];
  }
}

/**
 * Save presets to LocalStorage
 * @param {Array<Object>} presets - Array of preset objects
 * @returns {boolean} Success status
 */
export function savePresets(presets) {
  try {
    const data = {
      version: PRESET.STORAGE_VERSION,
      presets,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('[Presets] Failed to save presets:', error);
    return false;
  }
}

/**
 * Built-in presets definition (new format with main/utils)
 */
const BUILT_IN_PRESETS = [
  {
    id: 'default',
    name: 'Default',
    soundMain: DEFAULT_SOUND_SHADER,
    soundUtils: '',
    visualMain: DEFAULT_VISUAL_SHADER,
    visualUtils: '',
    isBuiltIn: true,
    createdAt: 0,
  },
  {
    id: 'demo',
    name: 'Demo',
    soundMain: DEMO_SOUND_SHADER,
    soundUtils: '',
    visualMain: DEFAULT_VISUAL_SHADER,
    visualUtils: '',
    isBuiltIn: true,
    createdAt: 0,
  },
];

/**
 * Get the default preset (built-in shaders)
 * @returns {Object} Default preset object
 */
export function getDefaultPreset() {
  return BUILT_IN_PRESETS[0];
}

/**
 * Get all built-in presets
 * @returns {Array<Object>} Array of built-in presets
 */
export function getBuiltInPresets() {
  return BUILT_IN_PRESETS;
}

/**
 * Get all presets including built-in presets
 * @returns {Array<Object>} Array of all presets with built-in first
 */
export function getAllPresets() {
  const userPresets = loadPresets();
  return [...BUILT_IN_PRESETS, ...userPresets];
}

/**
 * Create a new preset
 * @param {string} name - Preset name
 * @param {{ soundMain: string, soundUtils: string, visualMain: string, visualUtils: string }} codes - Shader codes
 * @returns {{ success: boolean, preset?: Object, error?: string }}
 */
export function createPreset(name, codes) {
  if (!name || !name.trim()) {
    return { success: false, error: 'Preset name is required' };
  }

  const trimmedName = name.trim();
  const isReservedName = BUILT_IN_PRESETS.some(
    (p) => p.name.toLowerCase() === trimmedName.toLowerCase(),
  );
  if (isReservedName) {
    return { success: false, error: `Cannot use reserved name "${trimmedName}"` };
  }

  const presets = loadPresets();
  if (presets.length >= PRESET.MAX_COUNT) {
    return { success: false, error: `Maximum ${PRESET.MAX_COUNT} presets allowed` };
  }

  const preset = {
    id: generateId(),
    name: trimmedName,
    soundMain: codes.soundMain,
    soundUtils: codes.soundUtils,
    visualMain: codes.visualMain,
    visualUtils: codes.visualUtils,
    isDefault: false,
    createdAt: Date.now(),
  };

  presets.push(preset);
  const saved = savePresets(presets);

  if (!saved) {
    return { success: false, error: 'Failed to save preset' };
  }

  return { success: true, preset };
}

/**
 * Check if a preset ID is a built-in preset
 * @param {string} id - Preset ID
 * @returns {boolean}
 */
export function isBuiltInPreset(id) {
  return BUILT_IN_PRESETS.some((p) => p.id === id);
}

/**
 * Delete a preset by ID
 * @param {string} id - Preset ID
 * @returns {{ success: boolean, error?: string }}
 */
export function deletePreset(id) {
  if (isBuiltInPreset(id)) {
    return { success: false, error: 'Cannot delete built-in preset' };
  }

  const presets = loadPresets();
  const index = presets.findIndex((p) => p.id === id);

  if (index === -1) {
    return { success: false, error: 'Preset not found' };
  }

  presets.splice(index, 1);
  const saved = savePresets(presets);

  if (!saved) {
    return { success: false, error: 'Failed to delete preset' };
  }

  return { success: true };
}

/**
 * Get a preset by ID
 * @param {string} id - Preset ID
 * @returns {Object | null} Preset object or null if not found
 */
export function getPresetById(id) {
  // Check built-in presets first
  const builtIn = BUILT_IN_PRESETS.find((p) => p.id === id);
  if (builtIn) {
    return builtIn;
  }

  const presets = loadPresets();
  return presets.find((p) => p.id === id) || null;
}

/**
 * Export a preset to JSON data
 * @param {string} id - Preset ID
 * @returns {{ success: boolean, data?: Object, error?: string }}
 */
export function exportPreset(id) {
  const preset = getPresetById(id);
  if (!preset) {
    return { success: false, error: 'Preset not found' };
  }

  // Support both old and new format presets
  const exportData = {
    version: 2,
    name: preset.name,
    soundMain: preset.soundMain ?? preset.soundCode ?? '',
    soundUtils: preset.soundUtils ?? '',
    visualMain: preset.visualMain ?? preset.visualCode ?? '',
    visualUtils: preset.visualUtils ?? '',
    exportedAt: Date.now(),
  };

  return { success: true, data: exportData };
}

/**
 * Validate import data structure (supports old and new formats)
 * @param {Object} data - Import data to validate
 * @returns {{ valid: boolean, error?: string }}
 */
function validateImportData(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data format' };
  }

  if (typeof data.name !== 'string' || !data.name.trim()) {
    return { valid: false, error: 'Invalid preset name' };
  }

  // Support both old format (soundCode/visualCode) and new format (soundMain/etc)
  const hasSoundCode = typeof data.soundMain === 'string' || typeof data.soundCode === 'string';
  const hasVisualCode = typeof data.visualMain === 'string' || typeof data.visualCode === 'string';

  if (!hasSoundCode) {
    return { valid: false, error: 'Invalid sound shader code' };
  }

  if (!hasVisualCode) {
    return { valid: false, error: 'Invalid visual shader code' };
  }

  return { valid: true };
}

/**
 * Import a preset from JSON data (supports old and new formats)
 * @param {Object} data - Import data
 * @returns {{ success: boolean, preset?: Object, error?: string }}
 */
export function importPreset(data) {
  const validation = validateImportData(data);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Convert old format to new format
  const codes = {
    soundMain: data.soundMain ?? data.soundCode ?? '',
    soundUtils: data.soundUtils ?? '',
    visualMain: data.visualMain ?? data.visualCode ?? '',
    visualUtils: data.visualUtils ?? '',
  };

  return createPreset(data.name, codes);
}

/**
 * Check if more presets can be saved
 * @returns {boolean}
 */
export function canSaveMorePresets() {
  const presets = loadPresets();
  return presets.length < PRESET.MAX_COUNT;
}

/**
 * Get the count of user presets (excluding default)
 * @returns {number}
 */
export function getPresetCount() {
  return loadPresets().length;
}
