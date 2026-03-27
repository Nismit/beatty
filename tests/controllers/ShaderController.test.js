import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShaderController } from '../../src/controllers/ShaderController.js';
import { EVENTS, UI } from '../../src/utils/consts.js';

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
      getCodeForCompile: vi.fn(() => ({
        main: 'vec2 mainSound(float t) { return vec2(0.0); }',
        utils: '',
      })),
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
    saveShader.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initShaders', () => {
    it('should compile both shaders', () => {
      const deps = createMockDeps();
      const controller = createShaderController(deps);

      controller.initShaders(
        { main: 'sound main', utils: 'sound utils' },
        { main: 'visual main', utils: 'visual utils' },
      );

      expect(deps.soundRenderer.compile).toHaveBeenCalledWith('sound main', 'sound utils');
      expect(deps.visualRenderer.compile).toHaveBeenCalledWith('visual main', 'visual utils');
    });

    it('should throw on compile error', () => {
      const deps = createMockDeps();
      deps.soundRenderer.compile.mockImplementation(() => {
        throw new Error('Compile failed');
      });
      const controller = createShaderController(deps);

      expect(() => controller.initShaders({ main: 'bad', utils: '' }, { main: 'visual', utils: '' })).toThrow('Compile failed');
    });
  });

  describe('compileShader', () => {
    it('should compile and emit success event', () => {
      const deps = createMockDeps();
      const controller = createShaderController(deps);

      controller.compileShader();

      expect(deps.soundRenderer.compile).toHaveBeenCalled();
      expect(saveShader).toHaveBeenCalled();
      expect(deps.eventBus.emit).toHaveBeenCalledWith(EVENTS.SHADER_COMPILE_SUCCESS, {
        mode: UI.EDITOR_MODES.SOUND,
      });
    });

    it('should call errorHandler on failure', () => {
      const deps = createMockDeps();
      const error = new Error('Compile failed');
      deps.soundRenderer.compile.mockImplementation(() => {
        throw error;
      });
      const controller = createShaderController(deps);

      controller.compileShader();

      expect(deps.errorHandler).toHaveBeenCalledWith(error);
      expect(deps.eventBus.emit).toHaveBeenCalledWith(EVENTS.SHADER_COMPILE_ERROR, { error });
    });
  });

  describe('applyCompiledShader', () => {
    it('should apply shader and emit event', () => {
      const deps = createMockDeps();
      const controller = createShaderController(deps);

      controller.applyCompiledShader();

      expect(deps.soundRenderer.applyCompiledShader).toHaveBeenCalled();
      expect(deps.eventBus.emit).toHaveBeenCalledWith(EVENTS.SHADER_APPLIED, {
        mode: UI.EDITOR_MODES.SOUND,
      });
    });

    it('should call errorHandler on failure', () => {
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
      const callCount = deps.statusDisplay.showStatus.mock.calls.length;
      controller.destroy();
      vi.advanceTimersByTime(5000);

      expect(deps.statusDisplay.showStatus.mock.calls.length).toBe(callCount);
    });
  });
});
