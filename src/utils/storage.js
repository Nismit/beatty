/**
 * Storage utilities for shader code and settings persistence
 * Provides pure functions for saving and loading data to/from LocalStorage
 */

import { DEFAULT_HOTKEY_MODIFIERS, STORAGE_KEYS } from './consts.js';

/**
 * Get storage key for given mode
 * @param {'sound' | 'visual'} mode - Shader mode
 * @returns {string} Storage key
 */
function getStorageKey(mode) {
  return mode === 'sound' ? STORAGE_KEYS.SOUND_SHADER : STORAGE_KEYS.VISUAL_SHADER;
}

/**
 * Save shader code to LocalStorage (new format with main/utils)
 * @param {'sound' | 'visual'} mode - Shader mode
 * @param {string} main - Main shader code
 * @param {string} [utils=''] - Utils shader code
 * @returns {boolean} Success status
 */
export function saveShader(mode, main, utils = '') {
  try {
    const key = getStorageKey(mode);
    const data = {
      main,
      utils,
      timestamp: Date.now(),
      version: '2.0',
    };

    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`[Storage] Failed to save ${mode} shader:`, error);
    return false;
  }
}

/**
 * Load shader code from LocalStorage
 * Handles migration from old format (code only) to new format (main + utils)
 * @param {'sound' | 'visual'} mode - Shader mode
 * @returns {{ main: string, utils: string } | null} Shader codes or null if not found
 */
export function loadShader(mode) {
  try {
    const key = getStorageKey(mode);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    const data = JSON.parse(stored);

    // Migration: old format (version 1.0 with 'code') -> new format (version 2.0 with 'main'/'utils')
    if (data.version === '1.0' || data.code !== undefined) {
      if (!data.code || typeof data.code !== 'string') {
        console.warn(`[Storage] Invalid ${mode} shader data, removing`);
        localStorage.removeItem(key);
        return null;
      }
      // Migrate to new format
      const migrated = { main: data.code, utils: '' };
      saveShader(mode, migrated.main, migrated.utils);
      return migrated;
    }

    // New format validation
    if (!data.main || typeof data.main !== 'string') {
      console.warn(`[Storage] Invalid ${mode} shader data, removing`);
      localStorage.removeItem(key);
      return null;
    }

    return {
      main: data.main,
      utils: data.utils || '',
    };
  } catch (error) {
    console.error(`[Storage] Failed to load ${mode} shader:`, error);
    return null;
  }
}

/**
 * Clear shader from storage
 * @param {'sound' | 'visual'} mode - Shader mode
 * @returns {boolean} Success status
 */
export function clearShader(mode) {
  try {
    const key = getStorageKey(mode);
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[Storage] Failed to clear ${mode} shader:`, error);
    return false;
  }
}

/**
 * Check if shader exists in storage
 * @param {'sound' | 'visual'} mode - Shader mode
 * @returns {boolean}
 */
export function hasShader(mode) {
  const key = getStorageKey(mode);
  return localStorage.getItem(key) !== null;
}

/**
 * Get storage usage information
 * @returns {{ hasSound: boolean, hasVisual: boolean }}
 */
export function getStorageInfo() {
  return {
    hasSound: hasShader('sound'),
    hasVisual: hasShader('visual'),
  };
}

/**
 * Save application settings to LocalStorage
 * @param {{ volume?: number, bpm?: number }} settings - Settings object
 * @returns {boolean} Success status
 */
export function saveSettings(settings) {
  try {
    const data = {
      volume: settings.volume,
      bpm: settings.bpm,
      timestamp: Date.now(),
      version: '1.0',
    };

    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('[Storage] Failed to save settings:', error);
    return false;
  }
}

/**
 * Load application settings from LocalStorage
 * @returns {{ volume: number | null, bpm: number | null } | null}
 */
export function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);

    if (!stored) {
      return null;
    }

    const data = JSON.parse(stored);

    // Validate and return only known settings
    return {
      volume: typeof data.volume === 'number' ? data.volume : null,
      bpm: typeof data.bpm === 'number' ? data.bpm : null,
    };
  } catch (error) {
    console.error('[Storage] Failed to load settings:', error);
    return null;
  }
}

/**
 * Clear all application settings from LocalStorage
 * @returns {boolean} Success status
 */
export function clearSettings() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    return true;
  } catch (error) {
    console.error('[Storage] Failed to clear settings:', error);
    return false;
  }
}

/**
 * Clear all Beatty data from LocalStorage
 * @returns {boolean} Success status
 */
export function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SOUND_SHADER);
    localStorage.removeItem(STORAGE_KEYS.VISUAL_SHADER);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.HOTKEY_SETTINGS);
    return true;
  } catch (error) {
    console.error('[Storage] Failed to clear all data:', error);
    return false;
  }
}

/**
 * Save hotkey settings to LocalStorage
 * @param {{ ctrl: boolean, shift: boolean, alt: boolean, meta: boolean }} modifiers
 * @returns {boolean} Success status
 */
export function saveHotkeySettings(modifiers) {
  try {
    const data = {
      modifiers,
      timestamp: Date.now(),
      version: '1.0',
    };

    localStorage.setItem(STORAGE_KEYS.HOTKEY_SETTINGS, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('[Storage] Failed to save hotkey settings:', error);
    return false;
  }
}

/**
 * Load hotkey settings from LocalStorage
 * @returns {{ ctrl: boolean, shift: boolean, alt: boolean, meta: boolean }}
 */
export function loadHotkeySettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.HOTKEY_SETTINGS);

    if (!stored) {
      return { ...DEFAULT_HOTKEY_MODIFIERS };
    }

    const data = JSON.parse(stored);

    if (!data.modifiers || typeof data.modifiers !== 'object') {
      console.warn('[Storage] Invalid hotkey settings data, using defaults');
      localStorage.removeItem(STORAGE_KEYS.HOTKEY_SETTINGS);
      return { ...DEFAULT_HOTKEY_MODIFIERS };
    }

    return {
      ctrl: Boolean(data.modifiers.ctrl),
      shift: Boolean(data.modifiers.shift),
      alt: Boolean(data.modifiers.alt),
      meta: Boolean(data.modifiers.meta),
    };
  } catch (error) {
    console.error('[Storage] Failed to load hotkey settings:', error);
    return { ...DEFAULT_HOTKEY_MODIFIERS };
  }
}
