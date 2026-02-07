/**
 * Storage utilities for shader code persistence
 * Provides functions for saving and loading shader code to/from LocalStorage
 */

// Storage keys
const SOUND_SHADER_KEY = 'melu_sound_shader';
const VISUAL_SHADER_KEY = 'melu_visual_shader';

/**
 * Get storage key for given mode
 * @param {string} mode - 'sound' or 'visual'
 * @returns {string} Storage key
 */
function getStorageKey(mode) {
  return mode === 'sound' ? SOUND_SHADER_KEY : VISUAL_SHADER_KEY;
}

/**
 * Save shader code to LocalStorage
 * @param {string} mode - 'sound' or 'visual'
 * @param {string} code - Shader code to save
 * @returns {boolean} Success status
 */
export function saveShader(mode, code) {
  try {
    const key = getStorageKey(mode);
    const data = {
      code: code,
      timestamp: Date.now(),
      version: '1.0'
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
 * @param {string} mode - 'sound' or 'visual'
 * @returns {string|null} Shader code or null if not found
 */
export function loadShader(mode) {
  try {
    const key = getStorageKey(mode);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return null;
    }
    
    const data = JSON.parse(stored);
    
    // Validate data structure
    if (!data.code || typeof data.code !== 'string') {
      console.warn(`[Storage] Invalid ${mode} shader data, removing`);
      localStorage.removeItem(key);
      return null;
    }
    
    return data.code;
  } catch (error) {
    console.error(`[Storage] Failed to load ${mode} shader:`, error);
    return null;
  }
}

/**
 * Check if shader exists in storage
 * @param {string} mode - 'sound' or 'visual'
 * @returns {boolean}
 */
export function hasShader(mode) {
  const key = getStorageKey(mode);
  return localStorage.getItem(key) !== null;
}

/**
 * Get storage usage information
 * @returns {object} Storage info with hasSound and hasVisual flags
 */
export function getStorageInfo() {
  return {
    hasSound: hasShader('sound'),
    hasVisual: hasShader('visual')
  };
}
