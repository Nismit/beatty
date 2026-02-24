import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createKeyboardController } from '../../src/input/KeyboardController.js';

function createMockDeps() {
  return {
    playbackController: {
      togglePlayback: vi.fn(),
      resetPlayback: vi.fn(),
    },
    shaderController: {
      compileShader: vi.fn(),
      applyCompiledShader: vi.fn(),
    },
    uiController: {
      hideHelpModal: vi.fn(),
    },
    editor: {
      toggleVisibility: vi.fn(),
      switchMode: vi.fn(),
    },
    presetModal: {
      hide: vi.fn(),
      show: vi.fn(),
    },
    debugOverlay: {
      toggle: vi.fn(),
    },
  };
}

function createKeyboardEvent(key, options = {}) {
  return new KeyboardEvent('keydown', {
    key,
    ctrlKey: options.ctrlKey || false,
    bubbles: true,
  });
}

describe('KeyboardController', () => {
  let controller;
  let deps;

  beforeEach(() => {
    deps = createMockDeps();
    controller = createKeyboardController(deps);
    controller.init();
  });

  afterEach(() => {
    controller.destroy();
  });

  describe('keyboard shortcuts', () => {
    it('should call togglePlayback on Ctrl+P', () => {
      document.dispatchEvent(createKeyboardEvent('p', { ctrlKey: true }));

      expect(deps.playbackController.togglePlayback).toHaveBeenCalled();
    });

    it('should call compileShader on Ctrl+S', () => {
      document.dispatchEvent(createKeyboardEvent('s', { ctrlKey: true }));

      expect(deps.shaderController.compileShader).toHaveBeenCalled();
    });

    it('should call applyCompiledShader on Ctrl+R', () => {
      document.dispatchEvent(createKeyboardEvent('r', { ctrlKey: true }));

      expect(deps.shaderController.applyCompiledShader).toHaveBeenCalled();
    });

    it('should close modals on Escape', () => {
      document.dispatchEvent(createKeyboardEvent('Escape'));

      expect(deps.uiController.hideHelpModal).toHaveBeenCalled();
      expect(deps.presetModal.hide).toHaveBeenCalled();
    });
  });

  describe('unhandled keys', () => {
    it('should not trigger actions for unhandled Ctrl+key', () => {
      document.dispatchEvent(createKeyboardEvent('x', { ctrlKey: true }));

      expect(deps.playbackController.togglePlayback).not.toHaveBeenCalled();
      expect(deps.shaderController.compileShader).not.toHaveBeenCalled();
    });

    it('should not trigger Ctrl actions without Ctrl modifier', () => {
      document.dispatchEvent(createKeyboardEvent('p'));
      document.dispatchEvent(createKeyboardEvent('s'));

      expect(deps.playbackController.togglePlayback).not.toHaveBeenCalled();
      expect(deps.shaderController.compileShader).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should remove event listener', () => {
      controller.destroy();

      document.dispatchEvent(createKeyboardEvent('p', { ctrlKey: true }));

      expect(deps.playbackController.togglePlayback).not.toHaveBeenCalled();
    });
  });
});
