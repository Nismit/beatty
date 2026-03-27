import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canSaveMorePresets,
  createPreset,
  deletePreset,
  exportPreset,
  getAllPresets,
  getDefaultPreset,
  getPresetById,
  getPresetCount,
  importPreset,
  loadPresets,
  savePresets,
} from '../../src/utils/presets.js';
import { PRESET, STORAGE_KEYS } from '../../src/utils/consts.js';

describe('presets', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadPresets', () => {
    it('should return empty array when no presets stored', () => {
      const presets = loadPresets();
      expect(presets).toEqual([]);
    });

    it('should load presets from localStorage', () => {
      const stored = {
        version: 1,
        presets: [{ id: '1', name: 'Test' }],
      };
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(stored));

      const presets = loadPresets();
      expect(presets).toEqual([{ id: '1', name: 'Test' }]);
    });

    it('should return empty array for invalid data', () => {
      localStorage.setItem(STORAGE_KEYS.PRESETS, 'invalid json');
      const presets = loadPresets();
      expect(presets).toEqual([]);
    });

    it('should return empty array when presets is not an array', () => {
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify({ presets: 'not array' }));
      const presets = loadPresets();
      expect(presets).toEqual([]);
    });
  });

  describe('savePresets', () => {
    it('should save presets to localStorage', () => {
      const presets = [{ id: '1', name: 'Test' }];
      const result = savePresets(presets);

      expect(result).toBe(true);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRESETS));
      expect(stored.presets).toEqual(presets);
      expect(stored.version).toBe(PRESET.STORAGE_VERSION);
    });
  });

  describe('getDefaultPreset', () => {
    it('should return default preset with correct structure', () => {
      const preset = getDefaultPreset();

      expect(preset.id).toBe('default');
      expect(preset.name).toBe(PRESET.DEFAULT_NAME);
      expect(preset.isBuiltIn).toBe(true);
      expect(preset.soundMain).toBeDefined();
      expect(preset.visualMain).toBeDefined();
    });
  });

  describe('getAllPresets', () => {
    it('should return default preset first', () => {
      const presets = getAllPresets();

      expect(presets.length).toBeGreaterThanOrEqual(1);
      expect(presets[0].id).toBe('default');
    });

    it('should include user presets after built-in presets', () => {
      const userPreset = { id: '1', name: 'User Preset' };
      savePresets([userPreset]);

      const presets = getAllPresets();

      // 2 built-in (default, demo) + 1 user preset
      expect(presets.length).toBe(3);
      expect(presets[2]).toEqual(userPreset);
    });
  });

  describe('createPreset', () => {
    const codes = { soundMain: 'sound main', soundUtils: '', visualMain: 'visual main', visualUtils: '' };

    it('should create a new preset', () => {
      const result = createPreset('My Preset', codes);

      expect(result.success).toBe(true);
      expect(result.preset.name).toBe('My Preset');
      expect(result.preset.soundMain).toBe('sound main');
      expect(result.preset.visualMain).toBe('visual main');
      expect(result.preset.id).toBeDefined();
    });

    it('should fail with empty name', () => {
      const result = createPreset('', codes);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Preset name is required');
    });

    it('should fail with reserved name "Default"', () => {
      const result = createPreset('Default', codes);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot use reserved name "Default"');
    });

    it('should fail when max presets reached', () => {
      // Create max presets
      const presets = Array.from({ length: PRESET.MAX_COUNT }, (_, i) => ({
        id: `preset-${i}`,
        name: `Preset ${i}`,
      }));
      savePresets(presets);

      const result = createPreset('One More', codes);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum');
    });

    it('should trim whitespace from name', () => {
      const result = createPreset('  Spaced Name  ', codes);

      expect(result.success).toBe(true);
      expect(result.preset.name).toBe('Spaced Name');
    });
  });

  describe('deletePreset', () => {
    it('should delete an existing preset', () => {
      savePresets([{ id: 'to-delete', name: 'Delete Me' }]);

      const result = deletePreset('to-delete');

      expect(result.success).toBe(true);
      expect(loadPresets()).toEqual([]);
    });

    it('should fail when deleting built-in preset', () => {
      const result = deletePreset('default');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delete built-in preset');
    });

    it('should fail when preset not found', () => {
      const result = deletePreset('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Preset not found');
    });
  });

  describe('getPresetById', () => {
    it('should return default preset for "default" id', () => {
      const preset = getPresetById('default');

      expect(preset.id).toBe('default');
      expect(preset.isBuiltIn).toBe(true);
    });

    it('should return user preset by id', () => {
      savePresets([{ id: 'user-1', name: 'User One' }]);

      const preset = getPresetById('user-1');

      expect(preset.name).toBe('User One');
    });

    it('should return null for non-existent preset', () => {
      const preset = getPresetById('non-existent');

      expect(preset).toBeNull();
    });
  });

  describe('exportPreset', () => {
    it('should export a preset', () => {
      savePresets([{ id: 'export-me', name: 'Export', soundMain: 's', soundUtils: '', visualMain: 'v', visualUtils: '' }]);

      const result = exportPreset('export-me');

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Export');
      expect(result.data.soundMain).toBe('s');
      expect(result.data.visualMain).toBe('v');
      expect(result.data.exportedAt).toBeDefined();
    });

    it('should export old format preset with new format', () => {
      savePresets([{ id: 'old', name: 'Old', soundCode: 'old-s', visualCode: 'old-v' }]);

      const result = exportPreset('old');

      expect(result.success).toBe(true);
      expect(result.data.soundMain).toBe('old-s');
      expect(result.data.visualMain).toBe('old-v');
    });

    it('should fail for non-existent preset', () => {
      const result = exportPreset('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Preset not found');
    });
  });

  describe('importPreset', () => {
    it('should import valid preset data (new format)', () => {
      const data = {
        name: 'Imported',
        soundMain: 'sound',
        soundUtils: '',
        visualMain: 'visual',
        visualUtils: '',
      };

      const result = importPreset(data);

      expect(result.success).toBe(true);
      expect(result.preset.name).toBe('Imported');
      expect(result.preset.soundMain).toBe('sound');
    });

    it('should import old format preset data', () => {
      const data = {
        name: 'Old Import',
        soundCode: 'sound',
        visualCode: 'visual',
      };

      const result = importPreset(data);

      expect(result.success).toBe(true);
      expect(result.preset.name).toBe('Old Import');
      expect(result.preset.soundMain).toBe('sound');
    });

    it('should fail with invalid data', () => {
      expect(importPreset(null).success).toBe(false);
      expect(importPreset({}).success).toBe(false);
      expect(importPreset({ name: '' }).success).toBe(false);
      expect(importPreset({ name: 'Test', soundMain: 123 }).success).toBe(false);
    });
  });

  describe('canSaveMorePresets', () => {
    it('should return true when under limit', () => {
      expect(canSaveMorePresets()).toBe(true);
    });

    it('should return false when at limit', () => {
      const presets = Array.from({ length: PRESET.MAX_COUNT }, (_, i) => ({
        id: `preset-${i}`,
        name: `Preset ${i}`,
      }));
      savePresets(presets);

      expect(canSaveMorePresets()).toBe(false);
    });
  });

  describe('getPresetCount', () => {
    it('should return 0 when no user presets', () => {
      expect(getPresetCount()).toBe(0);
    });

    it('should return correct count', () => {
      savePresets([{ id: '1' }, { id: '2' }, { id: '3' }]);
      expect(getPresetCount()).toBe(3);
    });
  });
});
