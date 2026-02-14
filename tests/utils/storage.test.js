import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../src/utils/consts.js';
import {
  clearAllData,
  clearSettings,
  clearShader,
  getStorageInfo,
  hasShader,
  loadSettings,
  loadShader,
  saveSettings,
  saveShader,
} from '../../src/utils/storage.js';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveShader / loadShader', () => {
    it('should save and load sound shader code', () => {
      const code = 'vec2 mainSound(float t) { return vec2(sin(t * 440.0)); }';

      const saved = saveShader('sound', code);
      const loaded = loadShader('sound');

      expect(saved).toBe(true);
      expect(loaded).toBe(code);
    });

    it('should save and load visual shader code', () => {
      const code = 'vec3 visualMain(vec2 uv) { return vec3(uv, 0.5); }';

      const saved = saveShader('visual', code);
      const loaded = loadShader('visual');

      expect(saved).toBe(true);
      expect(loaded).toBe(code);
    });

    it('should return null for non-existent shader', () => {
      expect(loadShader('sound')).toBeNull();
      expect(loadShader('visual')).toBeNull();
    });

    it('should include timestamp and version in stored data', () => {
      const code = 'test code';
      saveShader('sound', code);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUND_SHADER));
      expect(stored.code).toBe(code);
      expect(stored.version).toBe('1.0');
      expect(typeof stored.timestamp).toBe('number');
    });

    it('should overwrite existing shader', () => {
      saveShader('sound', 'first version');
      saveShader('sound', 'second version');

      expect(loadShader('sound')).toBe('second version');
    });

    it('should handle invalid stored data gracefully', () => {
      localStorage.setItem(STORAGE_KEYS.SOUND_SHADER, '{ invalid json }');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = loadShader('sound');
      consoleSpy.mockRestore();

      expect(result).toBeNull();
    });

    it('should handle stored data without code field', () => {
      const invalidData = { timestamp: Date.now(), version: '1.0' };
      localStorage.setItem(STORAGE_KEYS.SOUND_SHADER, JSON.stringify(invalidData));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = loadShader('sound');
      consoleSpy.mockRestore();

      expect(result).toBeNull();
      // Should have removed the invalid data
      expect(localStorage.getItem(STORAGE_KEYS.SOUND_SHADER)).toBeNull();
    });
  });

  describe('clearShader', () => {
    it('should clear sound shader', () => {
      saveShader('sound', 'test code');
      const cleared = clearShader('sound');

      expect(cleared).toBe(true);
      expect(loadShader('sound')).toBeNull();
    });

    it('should clear visual shader', () => {
      saveShader('visual', 'test code');
      const cleared = clearShader('visual');

      expect(cleared).toBe(true);
      expect(loadShader('visual')).toBeNull();
    });

    it('should return true even when shader does not exist', () => {
      expect(clearShader('sound')).toBe(true);
    });
  });

  describe('hasShader', () => {
    it('should return false for non-existent shader', () => {
      expect(hasShader('sound')).toBe(false);
      expect(hasShader('visual')).toBe(false);
    });

    it('should return true for existing shader', () => {
      saveShader('sound', 'test');
      expect(hasShader('sound')).toBe(true);
      expect(hasShader('visual')).toBe(false);
    });
  });

  describe('getStorageInfo', () => {
    it('should return correct info when no shaders saved', () => {
      const info = getStorageInfo();
      expect(info.hasSound).toBe(false);
      expect(info.hasVisual).toBe(false);
    });

    it('should return correct info when shaders saved', () => {
      saveShader('sound', 'sound code');

      const info = getStorageInfo();
      expect(info.hasSound).toBe(true);
      expect(info.hasVisual).toBe(false);
    });

    it('should return correct info when both shaders saved', () => {
      saveShader('sound', 'sound code');
      saveShader('visual', 'visual code');

      const info = getStorageInfo();
      expect(info.hasSound).toBe(true);
      expect(info.hasVisual).toBe(true);
    });
  });

  describe('saveSettings / loadSettings', () => {
    it('should save and load settings', () => {
      const saved = saveSettings({ bpm: 140, volume: 0.5 });
      const loaded = loadSettings();

      expect(saved).toBe(true);
      expect(loaded.bpm).toBe(140);
      expect(loaded.volume).toBe(0.5);
    });

    it('should return null when no settings saved', () => {
      expect(loadSettings()).toBeNull();
    });

    it('should include timestamp and version in stored data', () => {
      saveSettings({ bpm: 120, volume: 0.3 });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS));
      expect(stored.version).toBe('1.0');
      expect(typeof stored.timestamp).toBe('number');
    });

    it('should handle partial settings (bpm only)', () => {
      saveSettings({ bpm: 150 });
      const loaded = loadSettings();

      expect(loaded.bpm).toBe(150);
      expect(loaded.volume).toBeNull();
    });

    it('should handle partial settings (volume only)', () => {
      saveSettings({ volume: 0.8 });
      const loaded = loadSettings();

      expect(loaded.bpm).toBeNull();
      expect(loaded.volume).toBe(0.8);
    });

    it('should validate data types on load', () => {
      const invalidData = {
        bpm: 'not a number',
        volume: 'also not a number',
        timestamp: Date.now(),
        version: '1.0',
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(invalidData));

      const loaded = loadSettings();
      expect(loaded.bpm).toBeNull();
      expect(loaded.volume).toBeNull();
    });

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, 'invalid json');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = loadSettings();
      consoleSpy.mockRestore();

      expect(result).toBeNull();
    });
  });

  describe('clearSettings', () => {
    it('should clear settings', () => {
      saveSettings({ bpm: 140, volume: 0.5 });
      const cleared = clearSettings();

      expect(cleared).toBe(true);
      expect(loadSettings()).toBeNull();
    });

    it('should return true even when settings do not exist', () => {
      expect(clearSettings()).toBe(true);
    });
  });

  describe('clearAllData', () => {
    it('should clear all Beatty data', () => {
      saveShader('sound', 'sound code');
      saveShader('visual', 'visual code');
      saveSettings({ bpm: 140, volume: 0.5 });

      const cleared = clearAllData();

      expect(cleared).toBe(true);
      expect(loadShader('sound')).toBeNull();
      expect(loadShader('visual')).toBeNull();
      expect(loadSettings()).toBeNull();
    });

    it('should not affect other localStorage keys', () => {
      localStorage.setItem('other_app_key', 'some value');
      saveShader('sound', 'test');

      clearAllData();

      expect(localStorage.getItem('other_app_key')).toBe('some value');
    });
  });
});
