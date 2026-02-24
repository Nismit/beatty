import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPresetController } from '../../src/controllers/PresetController.js';
import { EVENTS } from '../../src/utils/consts.js';

vi.mock('../../src/utils/presets.js', () => ({
  getPresetById: vi.fn(),
}));

vi.mock('../../src/utils/storage.js', () => ({
  saveShader: vi.fn(),
}));

import { getPresetById } from '../../src/utils/presets.js';
import { saveShader } from '../../src/utils/storage.js';

function createMockDeps() {
  return {
    editor: {
      setCode: vi.fn(),
    },
    initShaders: vi.fn(),
    eventBus: {
      emit: vi.fn(),
    },
  };
}

const mockPreset = {
  id: 'test-preset-id',
  name: 'Test Preset',
  soundCode: 'vec2 mainSound(float t) { return vec2(sin(t)); }',
  visualCode: 'vec3 visualMain(vec2 uv) { return vec3(uv, 0.5); }',
  isDefault: false,
  createdAt: 1234567890,
};

describe('PresetController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveShader.mockReturnValue(true);
  });

  describe('loadPreset', () => {
    it('should load preset successfully', () => {
      const deps = createMockDeps();
      getPresetById.mockReturnValue(mockPreset);
      const controller = createPresetController(deps);

      const result = controller.loadPreset('test-preset-id');

      expect(result).toEqual({ success: true });
      expect(deps.editor.setCode).toHaveBeenCalledWith('sound', mockPreset.soundCode);
      expect(deps.editor.setCode).toHaveBeenCalledWith('visual', mockPreset.visualCode);
      expect(deps.eventBus.emit).toHaveBeenCalledWith(EVENTS.PRESET_LOADED, {
        preset: mockPreset,
      });
    });

    it('should return error when preset not found', () => {
      const deps = createMockDeps();
      getPresetById.mockReturnValue(null);
      const controller = createPresetController(deps);

      const result = controller.loadPreset('non-existent-id');

      expect(result).toEqual({ success: false, error: 'Preset not found' });
      expect(deps.editor.setCode).not.toHaveBeenCalled();
      expect(deps.initShaders).not.toHaveBeenCalled();
    });

    it('should handle editor.setCode throwing', () => {
      const deps = createMockDeps();
      getPresetById.mockReturnValue(mockPreset);
      deps.editor.setCode.mockImplementation(() => {
        throw new Error('setCode failed');
      });
      const controller = createPresetController(deps);

      expect(() => controller.loadPreset('test-preset-id')).toThrow('setCode failed');
    });
  });

  describe('destroy', () => {
    it('should be callable without error', () => {
      const deps = createMockDeps();
      const controller = createPresetController(deps);

      expect(() => controller.destroy()).not.toThrow();
    });
  });
});
