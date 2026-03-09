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
    settingsModal: {
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
    shiftKey: options.shiftKey || false,
    bubbles: true,
  });
}

// Test environment is not Mac, so shortcuts require Ctrl+Shift
const shortcutModifiers = { ctrlKey: true, shiftKey: true };

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
    it('should call togglePlayback on Ctrl+Shift+P', () => {
      document.dispatchEvent(createKeyboardEvent('P', shortcutModifiers));

      expect(deps.playbackController.togglePlayback).toHaveBeenCalled();
    });

    it('should call compileShader on Ctrl+Shift+C', () => {
      document.dispatchEvent(createKeyboardEvent('C', shortcutModifiers));

      expect(deps.shaderController.compileShader).toHaveBeenCalled();
    });

    it('should call applyCompiledShader on Ctrl+Shift+A', () => {
      document.dispatchEvent(createKeyboardEvent('A', shortcutModifiers));

      expect(deps.shaderController.applyCompiledShader).toHaveBeenCalled();
    });

    it('should call toggleVisibility on Ctrl+Shift+V', () => {
      document.dispatchEvent(createKeyboardEvent('V', shortcutModifiers));

      expect(deps.editor.toggleVisibility).toHaveBeenCalled();
    });

    it('should call switchMode on Ctrl+Shift+M', () => {
      document.dispatchEvent(createKeyboardEvent('M', shortcutModifiers));

      expect(deps.editor.switchMode).toHaveBeenCalled();
    });

    it('should not trigger shortcuts with only Ctrl (no Shift) on non-Mac', () => {
      document.dispatchEvent(createKeyboardEvent('p', { ctrlKey: true }));
      document.dispatchEvent(createKeyboardEvent('s', { ctrlKey: true }));

      expect(deps.playbackController.togglePlayback).not.toHaveBeenCalled();
      expect(deps.shaderController.compileShader).not.toHaveBeenCalled();
    });

    it('should close modals on Escape', () => {
      document.dispatchEvent(createKeyboardEvent('Escape'));

      expect(deps.uiController.hideHelpModal).toHaveBeenCalled();
      expect(deps.settingsModal.hide).toHaveBeenCalled();
    });
  });

  describe('unhandled keys', () => {
    it('should not trigger actions for unhandled Ctrl+Shift+key', () => {
      document.dispatchEvent(createKeyboardEvent('X', shortcutModifiers));

      expect(deps.playbackController.togglePlayback).not.toHaveBeenCalled();
      expect(deps.shaderController.compileShader).not.toHaveBeenCalled();
    });

    it('should not trigger actions without any modifiers', () => {
      document.dispatchEvent(createKeyboardEvent('p'));
      document.dispatchEvent(createKeyboardEvent('s'));

      expect(deps.playbackController.togglePlayback).not.toHaveBeenCalled();
      expect(deps.shaderController.compileShader).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should remove event listener', () => {
      controller.destroy();

      document.dispatchEvent(createKeyboardEvent('P', shortcutModifiers));

      expect(deps.playbackController.togglePlayback).not.toHaveBeenCalled();
    });
  });
});
