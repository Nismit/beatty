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

function cleanupDOM() {
  document.body.innerHTML = '';
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
    cleanupDOM();
  });

  describe('status bar clicks', () => {
    it('should show BPM slider popup on bpmStatus click', () => {
      const el = document.getElementById('bpmStatus');
      el.click();

      expect(deps.uiController.showSliderPopup).toHaveBeenCalledWith('bpm', expect.any(MouseEvent));
    });

    it('should show volume slider popup on volumeStatus click', () => {
      const el = document.getElementById('volumeStatus');
      el.click();

      expect(deps.uiController.showSliderPopup).toHaveBeenCalledWith(
        'volume',
        expect.any(MouseEvent),
      );
    });

    it('should show help modal on helpStatus click', () => {
      const el = document.getElementById('helpStatus');
      el.click();

      expect(deps.uiController.showHelpModal).toHaveBeenCalled();
    });

    it('should hide help modal on closeHelp click', () => {
      const el = document.getElementById('closeHelp');
      el.click();

      expect(deps.uiController.hideHelpModal).toHaveBeenCalled();
    });
  });

  describe('document click to dismiss', () => {
    it('should hide slider popups when clicking outside', () => {
      document.body.click();

      expect(deps.uiController.hideAllSliderPopups).toHaveBeenCalled();
    });

    it('should not hide slider popups when clicking inside slider-popup', () => {
      const popup = document.querySelector('.slider-popup');
      popup.click();

      expect(deps.uiController.hideAllSliderPopups).not.toHaveBeenCalled();
    });

    it('should hide preset modal when clicking outside', () => {
      document.body.click();

      expect(deps.presetModal.hide).toHaveBeenCalled();
    });

    it('should not hide preset modal when clicking inside modal-content', () => {
      const modal = document.querySelector('.modal-content');
      modal.click();

      expect(deps.presetModal.hide).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should remove all event listeners', () => {
      controller.destroy();

      // Reset mocks
      vi.clearAllMocks();

      // These should not trigger after destroy
      document.getElementById('bpmStatus').click();
      document.body.click();

      expect(deps.uiController.showSliderPopup).not.toHaveBeenCalled();
      expect(deps.uiController.hideAllSliderPopups).not.toHaveBeenCalled();
    });
  });

  describe('missing elements', () => {
    it('should handle missing elements gracefully', () => {
      cleanupDOM();
      document.body.innerHTML = ''; // No elements

      const newDeps = createMockDeps();
      const newController = createModalController(newDeps);

      // Should not throw
      expect(() => newController.init()).not.toThrow();
      newController.destroy();
    });
  });
});
