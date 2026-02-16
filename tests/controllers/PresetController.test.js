import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPresetController } from '../../src/controllers/PresetController.js';
import { EVENTS } from '../../src/utils/consts.js';

// Mock presets module
vi.mock('../../src/utils/presets.js', () => ({
  getPresetById: vi.fn(),
}));

// Mock storage module
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
  });

  describe('loadPreset', () => {
    it('should load preset successfully', () => {
      const deps = createMockDeps();
      getPresetById.mockReturnValue(mockPreset);
      const controller = createPresetController(deps);

      const result = controller.loadPreset('test-preset-id');

      expect(result).toEqual({ success: true });
      expect(getPresetById).toHaveBeenCalledWith('test-preset-id');
    });

    it('should update editor with preset code', () => {
      const deps = createMockDeps();
      getPresetById.mockReturnValue(mockPreset);
      const controller = createPresetController(deps);

      controller.loadPreset('test-preset-id');

      expect(deps.editor.setCode).toHaveBeenCalledWith('sound', mockPreset.soundCode);
      expect(deps.editor.setCode).toHaveBeenCalledWith('visual', mockPreset.visualCode);
    });

    it('should save shader code to LocalStorage', () => {
      const deps = createMockDeps();
      getPresetById.mockReturnValue(mockPreset);
      const controller = createPresetController(deps);

      controller.loadPreset('test-preset-id');

      expect(saveShader).toHaveBeenCalledWith('sound', mockPreset.soundCode);
      expect(saveShader).toHaveBeenCalledWith('visual', mockPreset.visualCode);
    });

    it('should compile and apply shaders via initShaders', () => {
      const deps = createMockDeps();
      getPresetById.mockReturnValue(mockPreset);
      const controller = createPresetController(deps);

      controller.loadPreset('test-preset-id');

      expect(deps.initShaders).toHaveBeenCalledWith(mockPreset.soundCode, mockPreset.visualCode);
    });

    it('should emit PRESET_LOADED event', () => {
      const deps = createMockDeps();
      getPresetById.mockReturnValue(mockPreset);
      const controller = createPresetController(deps);

      controller.loadPreset('test-preset-id');

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
    });

    it('should not update editor when preset not found', () => {
      const deps = createMockDeps();
      getPresetById.mockReturnValue(null);
      const controller = createPresetController(deps);

      controller.loadPreset('non-existent-id');

      expect(deps.editor.setCode).not.toHaveBeenCalled();
      expect(deps.initShaders).not.toHaveBeenCalled();
      expect(deps.eventBus.emit).not.toHaveBeenCalled();
    });

    it('should load default preset', () => {
      const deps = createMockDeps();
      const defaultPreset = {
        id: 'default',
        name: 'Default',
        soundCode: 'default sound code',
        visualCode: 'default visual code',
        isDefault: true,
      };
      getPresetById.mockReturnValue(defaultPreset);
      const controller = createPresetController(deps);

      const result = controller.loadPreset('default');

      expect(result).toEqual({ success: true });
      expect(getPresetById).toHaveBeenCalledWith('default');
      expect(deps.editor.setCode).toHaveBeenCalledWith('sound', defaultPreset.soundCode);
      expect(deps.editor.setCode).toHaveBeenCalledWith('visual', defaultPreset.visualCode);
    });
  });

  describe('destroy', () => {
    it('should exist and be callable', () => {
      const deps = createMockDeps();
      const controller = createPresetController(deps);

      expect(() => controller.destroy()).not.toThrow();
    });
  });
});
