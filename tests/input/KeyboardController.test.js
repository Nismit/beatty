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

  describe('Escape key', () => {
    it('should hide help modal on Escape', () => {
      document.dispatchEvent(createKeyboardEvent('Escape'));

      expect(deps.uiController.hideHelpModal).toHaveBeenCalled();
    });

    it('should hide preset modal on Escape', () => {
      document.dispatchEvent(createKeyboardEvent('Escape'));

      expect(deps.presetModal.hide).toHaveBeenCalled();
    });
  });

  describe('Ctrl+P', () => {
    it('should toggle playback', () => {
      document.dispatchEvent(createKeyboardEvent('p', { ctrlKey: true }));

      expect(deps.playbackController.togglePlayback).toHaveBeenCalled();
    });
  });

  describe('Ctrl+S', () => {
    it('should compile shader', () => {
      document.dispatchEvent(createKeyboardEvent('s', { ctrlKey: true }));

      expect(deps.shaderController.compileShader).toHaveBeenCalled();
    });
  });

  describe('Ctrl+R', () => {
    it('should apply compiled shader', () => {
      document.dispatchEvent(createKeyboardEvent('r', { ctrlKey: true }));

      expect(deps.shaderController.applyCompiledShader).toHaveBeenCalled();
    });
  });

  describe('Ctrl+T', () => {
    it('should toggle editor visibility', () => {
      document.dispatchEvent(createKeyboardEvent('t', { ctrlKey: true }));

      expect(deps.editor.toggleVisibility).toHaveBeenCalled();
    });
  });

  describe('Ctrl+E', () => {
    it('should switch editor mode', () => {
      document.dispatchEvent(createKeyboardEvent('e', { ctrlKey: true }));

      expect(deps.editor.switchMode).toHaveBeenCalled();
    });
  });

  describe('Ctrl+I', () => {
    it('should reset playback', () => {
      document.dispatchEvent(createKeyboardEvent('i', { ctrlKey: true }));

      expect(deps.playbackController.resetPlayback).toHaveBeenCalled();
    });
  });

  describe('Ctrl+G', () => {
    it('should show preset modal', () => {
      document.dispatchEvent(createKeyboardEvent('g', { ctrlKey: true }));

      expect(deps.presetModal.show).toHaveBeenCalled();
    });
  });

  describe('unhandled keys', () => {
    it('should not trigger actions for unhandled keys', () => {
      document.dispatchEvent(createKeyboardEvent('x', { ctrlKey: true }));

      expect(deps.playbackController.togglePlayback).not.toHaveBeenCalled();
      expect(deps.shaderController.compileShader).not.toHaveBeenCalled();
    });

    it('should not trigger actions without Ctrl modifier', () => {
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
