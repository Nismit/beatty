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
 * Built-in presets definition
 */
const BUILT_IN_PRESETS = [
  {
    id: 'default',
    name: 'Default',
    soundCode: DEFAULT_SOUND_SHADER,
    visualCode: DEFAULT_VISUAL_SHADER,
    isBuiltIn: true,
    createdAt: 0,
  },
  {
    id: 'demo',
    name: 'Demo',
    soundCode: DEMO_SOUND_SHADER,
    visualCode: DEFAULT_VISUAL_SHADER,
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
 * @param {string} soundCode - Sound shader code
 * @param {string} visualCode - Visual shader code
 * @returns {{ success: boolean, preset?: Object, error?: string }}
 */
export function createPreset(name, soundCode, visualCode) {
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
    soundCode,
    visualCode,
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

  const exportData = {
    version: PRESET.STORAGE_VERSION,
    name: preset.name,
    soundCode: preset.soundCode,
    visualCode: preset.visualCode,
    exportedAt: Date.now(),
  };

  return { success: true, data: exportData };
}

/**
 * Validate import data structure
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

  if (typeof data.soundCode !== 'string') {
    return { valid: false, error: 'Invalid sound shader code' };
  }

  if (typeof data.visualCode !== 'string') {
    return { valid: false, error: 'Invalid visual shader code' };
  }

  return { valid: true };
}

/**
 * Import a preset from JSON data
 * @param {Object} data - Import data
 * @returns {{ success: boolean, preset?: Object, error?: string }}
 */
export function importPreset(data) {
  const validation = validateImportData(data);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  return createPreset(data.name, data.soundCode, data.visualCode);
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
