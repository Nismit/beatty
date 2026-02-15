import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShaderController } from '../../src/controllers/ShaderController.js';
import { EVENTS, UI } from '../../src/utils/consts.js';

// Mock storage module
vi.mock('../../src/utils/storage.js', () => ({
  saveShader: vi.fn(),
}));

import { saveShader } from '../../src/utils/storage.js';

function createMockDeps() {
  return {
    soundRenderer: {
      compile: vi.fn(),
      applyCompiledShader: vi.fn(),
    },
    visualRenderer: {
      compile: vi.fn(),
      applyCompiledShader: vi.fn(),
    },
    editor: {
      mode: UI.EDITOR_MODES.SOUND,
      getCurrentCode: vi.fn(() => 'vec2 mainSound(float t) { return vec2(0.0); }'),
    },
    statusDisplay: {
      showStatus: vi.fn(),
    },
    eventBus: {
      emit: vi.fn(),
      on: vi.fn(() => vi.fn()),
    },
    errorHandler: vi.fn(),
  };
}

describe('ShaderController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initShaders', () => {
    it('should compile both sound and visual shaders', () => {
      const deps = createMockDeps();
      const controller = createShaderController(deps);

      controller.initShaders('sound code', 'visual code');

      expect(deps.soundRenderer.compile).toHaveBeenCalledWith('sound code');
      expect(deps.visualRenderer.compile).toHaveBeenCalledWith('visual code');
    });
  });

  describe('compileShader', () => {
    it('should compile sound shader when in sound mode', () => {
      const deps = createMockDeps();
      deps.editor.mode = UI.EDITOR_MODES.SOUND;
      const controller = createShaderController(deps);

      controller.compileShader();

      expect(deps.eventBus.emit).toHaveBeenCalledWith(EVENTS.SHADER_COMPILE_START, {
        mode: UI.EDITOR_MODES.SOUND,
      });
      expect(deps.soundRenderer.compile).toHaveBeenCalled();
      expect(saveShader).toHaveBeenCalledWith('sound', expect.any(String));
      expect(deps.statusDisplay.showStatus).toHaveBeenCalledWith(null, UI.STATUS_TYPES.COMPILED);
      expect(deps.eventBus.emit).toHaveBeenCalledWith(EVENTS.SHADER_COMPILE_SUCCESS, {
        mode: UI.EDITOR_MODES.SOUND,
      });
    });

    it('should compile visual shader when in visual mode', () => {
      const deps = createMockDeps();
      deps.editor.mode = UI.EDITOR_MODES.VISUAL;
      deps.editor.getCurrentCode = vi.fn(() => 'vec3 visualMain(vec2 uv) { return vec3(0.0); }');
      const controller = createShaderController(deps);

      controller.compileShader();

      expect(deps.visualRenderer.compile).toHaveBeenCalled();
      expect(saveShader).toHaveBeenCalledWith('visual', expect.any(String));
    });

    it('should handle compile errors', () => {
      const deps = createMockDeps();
      const error = new Error('Compile failed');
      deps.soundRenderer.compile.mockImplementation(() => {
        throw error;
      });
      const controller = createShaderController(deps);

      controller.compileShader();

      expect(deps.eventBus.emit).toHaveBeenCalledWith(EVENTS.SHADER_COMPILE_ERROR, { error });
      expect(deps.errorHandler).toHaveBeenCalledWith(error);
    });

    it('should clear status after delay', () => {
      const deps = createMockDeps();
      const controller = createShaderController(deps);

      controller.compileShader();

      expect(deps.statusDisplay.showStatus).toHaveBeenCalledWith(null, UI.STATUS_TYPES.COMPILED);

      vi.advanceTimersByTime(3000);

      expect(deps.statusDisplay.showStatus).toHaveBeenCalledWith(null, UI.STATUS_TYPES.READY);
    });
  });

  describe('applyCompiledShader', () => {
    it('should apply sound shader when in sound mode', () => {
      const deps = createMockDeps();
      deps.editor.mode = UI.EDITOR_MODES.SOUND;
      const controller = createShaderController(deps);

      controller.applyCompiledShader();

      expect(deps.soundRenderer.applyCompiledShader).toHaveBeenCalled();
      expect(deps.statusDisplay.showStatus).toHaveBeenCalledWith(null, UI.STATUS_TYPES.APPLIED);
      expect(deps.eventBus.emit).toHaveBeenCalledWith(EVENTS.SHADER_APPLIED, {
        mode: UI.EDITOR_MODES.SOUND,
      });
    });

    it('should apply visual shader when in visual mode', () => {
      const deps = createMockDeps();
      deps.editor.mode = UI.EDITOR_MODES.VISUAL;
      const controller = createShaderController(deps);

      controller.applyCompiledShader();

      expect(deps.visualRenderer.applyCompiledShader).toHaveBeenCalled();
    });

    it('should handle apply errors', () => {
      const deps = createMockDeps();
      const error = new Error('Apply failed');
      deps.soundRenderer.applyCompiledShader.mockImplementation(() => {
        throw error;
      });
      const controller = createShaderController(deps);

      controller.applyCompiledShader();

      expect(deps.errorHandler).toHaveBeenCalledWith(error);
    });
  });

  describe('destroy', () => {
    it('should clear pending status timer', () => {
      const deps = createMockDeps();
      const controller = createShaderController(deps);

      controller.compileShader();
      controller.destroy();

      // Advance time - status should NOT be updated after destroy
      const callCountBefore = deps.statusDisplay.showStatus.mock.calls.length;
      vi.advanceTimersByTime(3000);
      const callCountAfter = deps.statusDisplay.showStatus.mock.calls.length;

      expect(callCountAfter).toBe(callCountBefore);
    });
  });
});
