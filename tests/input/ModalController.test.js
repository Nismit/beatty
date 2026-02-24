import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createModalController } from '../../src/input/ModalController.js';

function createMockDeps() {
  return {
    uiController: {
      showSliderPopup: vi.fn(),
      showHelpModal: vi.fn(),
      hideHelpModal: vi.fn(),
      hideAllSliderPopups: vi.fn(),
    },
    presetModal: {
      hide: vi.fn(),
    },
  };
}

function setupDOM() {
  document.body.innerHTML = `
    <div id="bpmStatus" class="status-clickable"></div>
    <div id="volumeStatus" class="status-clickable"></div>
    <div id="helpStatus"></div>
    <div id="closeHelp"></div>
    <div class="slider-popup"></div>
    <div class="modal-content"></div>
  `;
}

describe('ModalController', () => {
  let controller;
  let deps;

  beforeEach(() => {
    setupDOM();
    deps = createMockDeps();
    controller = createModalController(deps);
    controller.init();
  });

  afterEach(() => {
    controller.destroy();
    document.body.innerHTML = '';
  });

  describe('status bar clicks', () => {
    it('should show BPM slider popup', () => {
      document.getElementById('bpmStatus').click();

      expect(deps.uiController.showSliderPopup).toHaveBeenCalledWith('bpm', expect.any(MouseEvent));
    });

    it('should show volume slider popup', () => {
      document.getElementById('volumeStatus').click();

      expect(deps.uiController.showSliderPopup).toHaveBeenCalledWith('volume', expect.any(MouseEvent));
    });

    it('should show help modal', () => {
      document.getElementById('helpStatus').click();

      expect(deps.uiController.showHelpModal).toHaveBeenCalled();
    });
  });

  describe('document click to dismiss', () => {
    it('should hide popups when clicking outside', () => {
      document.body.click();

      expect(deps.uiController.hideAllSliderPopups).toHaveBeenCalled();
      expect(deps.presetModal.hide).toHaveBeenCalled();
    });

    it('should not hide slider popup when clicking inside', () => {
      document.querySelector('.slider-popup').click();

      expect(deps.uiController.hideAllSliderPopups).not.toHaveBeenCalled();
    });

    it('should not hide preset modal when clicking inside modal-content', () => {
      document.querySelector('.modal-content').click();

      expect(deps.presetModal.hide).not.toHaveBeenCalled();
    });
  });

  describe('missing elements', () => {
    it('should handle missing elements gracefully', () => {
      document.body.innerHTML = '';
      const newDeps = createMockDeps();
      const newController = createModalController(newDeps);

      expect(() => newController.init()).not.toThrow();
      newController.destroy();
    });
  });

  describe('destroy', () => {
    it('should remove event listeners', () => {
      controller.destroy();
      vi.clearAllMocks();

      document.getElementById('bpmStatus')?.click();
      document.body.click();

      expect(deps.uiController.showSliderPopup).not.toHaveBeenCalled();
    });
  });
});
