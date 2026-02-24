import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUIController } from '../../src/controllers/UIController.js';
import { EVENTS, UI } from '../../src/utils/consts.js';

function createMockDeps() {
  return {
    playbackState: {
      isPlaying: false,
      isPaused: false,
    },
    audioSettings: {
      bpm: 120,
      volume: 0.5,
    },
    editor: {
      mode: UI.EDITOR_MODES.SOUND,
      isVisible: true,
    },
    eventBus: {
      emit: vi.fn(),
      on: vi.fn(() => vi.fn()),
    },
  };
}

function setupDOM() {
  document.body.innerHTML = `
    <button id="mobilePlayToggle"></button>
    <button id="mobileToggleEditor"></button>
    <button id="mobileToggleMode"></button>
    <div id="statusLine"></div>
    <div id="bpmSliderPopup" class="slider-popup">
      <input id="bpmSlider" type="range" min="20" max="300" step="1" />
      <span id="bpmValue"></span>
    </div>
    <div id="volumeSliderPopup" class="slider-popup">
      <input id="volumeSlider" type="range" min="0" max="1" step="0.01" />
      <span id="volumeValue"></span>
    </div>
    <div id="helpModal">
      <button id="closeHelp"></button>
    </div>
  `;
}

describe('UIController', () => {
  beforeEach(() => {
    setupDOM();
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('event subscriptions', () => {
    it('should subscribe to state change events', () => {
      const deps = createMockDeps();
      createUIController(deps);

      expect(deps.eventBus.on).toHaveBeenCalledWith(EVENTS.PLAY_STATE_CHANGED, expect.any(Function));
      expect(deps.eventBus.on).toHaveBeenCalledWith(EVENTS.EDITOR_MODE_CHANGED, expect.any(Function));
    });
  });

  describe('updatePlayButton', () => {
    it('should update button based on playback state', () => {
      const deps = createMockDeps();
      deps.playbackState.isPlaying = true;
      const controller = createUIController(deps);

      controller.updatePlayButton();

      const btn = document.getElementById('mobilePlayToggle');
      expect(btn.classList.contains('active')).toBe(true);
    });

    it('should handle missing element gracefully', () => {
      document.getElementById('mobilePlayToggle').remove();
      const deps = createMockDeps();
      const controller = createUIController(deps);

      expect(() => controller.updatePlayButton()).not.toThrow();
    });
  });

  describe('showSliderPopup', () => {
    it('should show BPM popup with current value', () => {
      const deps = createMockDeps();
      deps.audioSettings.bpm = 140;
      const controller = createUIController(deps);
      const mockEvent = { target: { getBoundingClientRect: () => ({ top: 100 }) } };

      controller.showSliderPopup('bpm', mockEvent);

      const popup = document.getElementById('bpmSliderPopup');
      expect(popup.classList.contains('visible')).toBe(true);
    });

    it('should handle missing popup element gracefully', () => {
      document.getElementById('bpmSliderPopup').remove();
      const deps = createMockDeps();
      const controller = createUIController(deps);
      const mockEvent = { target: { getBoundingClientRect: () => ({ top: 100 }) } };

      expect(() => controller.showSliderPopup('bpm', mockEvent)).not.toThrow();
    });
  });

  describe('showHelpModal / hideHelpModal', () => {
    it('should toggle help modal visibility', () => {
      const deps = createMockDeps();
      const controller = createUIController(deps);

      controller.showHelpModal();
      expect(document.getElementById('helpModal').classList.contains('visible')).toBe(true);

      controller.hideHelpModal();
      expect(document.getElementById('helpModal').classList.contains('visible')).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should unsubscribe from all events', () => {
      const unsubscribe = vi.fn();
      const deps = createMockDeps();
      deps.eventBus.on.mockReturnValue(unsubscribe);
      const controller = createUIController(deps);

      controller.destroy();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
