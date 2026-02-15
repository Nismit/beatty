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
    it('should subscribe to playback state changes', () => {
      const deps = createMockDeps();
      createUIController(deps);

      expect(deps.eventBus.on).toHaveBeenCalledWith(
        EVENTS.PLAY_STATE_CHANGED,
        expect.any(Function),
      );
    });

    it('should subscribe to editor mode changes', () => {
      const deps = createMockDeps();
      createUIController(deps);

      expect(deps.eventBus.on).toHaveBeenCalledWith(
        EVENTS.EDITOR_MODE_CHANGED,
        expect.any(Function),
      );
    });

    it('should subscribe to editor visibility changes', () => {
      const deps = createMockDeps();
      createUIController(deps);

      expect(deps.eventBus.on).toHaveBeenCalledWith(
        EVENTS.EDITOR_VISIBILITY_CHANGED,
        expect.any(Function),
      );
    });
  });

  describe('updatePlayButton', () => {
    it('should show pause icon when playing', () => {
      const deps = createMockDeps();
      deps.playbackState.isPlaying = true;
      const controller = createUIController(deps);

      controller.updatePlayButton();

      const btn = document.getElementById('mobilePlayToggle');
      expect(btn.classList.contains('active')).toBe(true);
      expect(btn.textContent).toBe('\u23F8');
      expect(btn.title).toBe('Pause');
    });

    it('should show play icon when not playing', () => {
      const deps = createMockDeps();
      deps.playbackState.isPlaying = false;
      const controller = createUIController(deps);

      controller.updatePlayButton();

      const btn = document.getElementById('mobilePlayToggle');
      expect(btn.classList.contains('active')).toBe(false);
      expect(btn.textContent).toBe('\u25B6');
      expect(btn.title).toBe('Play');
    });
  });

  describe('updateEditorButton', () => {
    it('should show eye icon when editor is visible', () => {
      const deps = createMockDeps();
      deps.editor.isVisible = true;
      const controller = createUIController(deps);

      controller.updateEditorButton();

      const btn = document.getElementById('mobileToggleEditor');
      expect(btn.classList.contains('active')).toBe(true);
      expect(btn.title).toBe('Hide Editor');
    });

    it('should show edit icon when editor is hidden', () => {
      const deps = createMockDeps();
      deps.editor.isVisible = false;
      const controller = createUIController(deps);

      controller.updateEditorButton();

      const btn = document.getElementById('mobileToggleEditor');
      expect(btn.classList.contains('active')).toBe(false);
      expect(btn.title).toBe('Show Editor');
    });
  });

  describe('updateModeButton', () => {
    it('should show music icon in sound mode', () => {
      const deps = createMockDeps();
      deps.editor.mode = UI.EDITOR_MODES.SOUND;
      const controller = createUIController(deps);

      controller.updateModeButton();

      const btn = document.getElementById('mobileToggleMode');
      expect(btn.textContent).toBe('\uD83C\uDFB5');
      expect(btn.title).toBe('Switch to Visual Mode');
    });

    it('should show art icon in visual mode', () => {
      const deps = createMockDeps();
      deps.editor.mode = UI.EDITOR_MODES.VISUAL;
      const controller = createUIController(deps);

      controller.updateModeButton();

      const btn = document.getElementById('mobileToggleMode');
      expect(btn.textContent).toBe('\uD83C\uDFA8');
      expect(btn.title).toBe('Switch to Sound Mode');
    });
  });

  describe('updateModeIndicator', () => {
    it('should add sound class in sound mode', () => {
      const deps = createMockDeps();
      deps.editor.mode = UI.EDITOR_MODES.SOUND;
      const controller = createUIController(deps);

      controller.updateModeIndicator();

      const statusLine = document.getElementById('statusLine');
      expect(statusLine.classList.contains('sound')).toBe(true);
      expect(statusLine.classList.contains('visual')).toBe(false);
    });

    it('should add visual class in visual mode', () => {
      const deps = createMockDeps();
      deps.editor.mode = UI.EDITOR_MODES.VISUAL;
      const controller = createUIController(deps);

      controller.updateModeIndicator();

      const statusLine = document.getElementById('statusLine');
      expect(statusLine.classList.contains('visual')).toBe(true);
      expect(statusLine.classList.contains('sound')).toBe(false);
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
      const slider = document.getElementById('bpmSlider');
      const value = document.getElementById('bpmValue');

      expect(popup.classList.contains('visible')).toBe(true);
      expect(slider.value).toBe('140');
      expect(value.textContent).toBe('140');
    });

    it('should show volume popup with current value', () => {
      const deps = createMockDeps();
      deps.audioSettings.volume = 0.75;
      const controller = createUIController(deps);
      const mockEvent = { target: { getBoundingClientRect: () => ({ top: 100 }) } };

      controller.showSliderPopup('volume', mockEvent);

      const popup = document.getElementById('volumeSliderPopup');
      const slider = document.getElementById('volumeSlider');
      const value = document.getElementById('volumeValue');

      expect(popup.classList.contains('visible')).toBe(true);
      expect(slider.value).toBe('0.75');
      expect(value.textContent).toBe('75%');
    });
  });

  describe('hideAllSliderPopups', () => {
    it('should hide all slider popups', () => {
      const deps = createMockDeps();
      const controller = createUIController(deps);

      document.getElementById('bpmSliderPopup').classList.add('visible');
      document.getElementById('volumeSliderPopup').classList.add('visible');

      controller.hideAllSliderPopups();

      expect(document.getElementById('bpmSliderPopup').classList.contains('visible')).toBe(false);
      expect(document.getElementById('volumeSliderPopup').classList.contains('visible')).toBe(
        false,
      );
    });
  });

  describe('showHelpModal / hideHelpModal', () => {
    it('should show help modal', () => {
      const deps = createMockDeps();
      const controller = createUIController(deps);

      controller.showHelpModal();

      const modal = document.getElementById('helpModal');
      expect(modal.classList.contains('visible')).toBe(true);
    });

    it('should hide help modal', () => {
      const deps = createMockDeps();
      const controller = createUIController(deps);

      document.getElementById('helpModal').classList.add('visible');
      controller.hideHelpModal();

      const modal = document.getElementById('helpModal');
      expect(modal.classList.contains('visible')).toBe(false);
    });
  });

  describe('initButtonStates', () => {
    it('should update all button states', () => {
      const deps = createMockDeps();
      deps.playbackState.isPlaying = true;
      deps.editor.isVisible = false;
      deps.editor.mode = UI.EDITOR_MODES.VISUAL;
      const controller = createUIController(deps);

      controller.initButtonStates();

      expect(document.getElementById('mobilePlayToggle').classList.contains('active')).toBe(true);
      expect(document.getElementById('mobileToggleEditor').classList.contains('active')).toBe(
        false,
      );
      expect(document.getElementById('statusLine').classList.contains('visual')).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should unsubscribe from all events', () => {
      const unsubscribe1 = vi.fn();
      const unsubscribe2 = vi.fn();
      const unsubscribe3 = vi.fn();

      const deps = createMockDeps();
      deps.eventBus.on = vi
        .fn()
        .mockReturnValueOnce(unsubscribe1)
        .mockReturnValueOnce(unsubscribe2)
        .mockReturnValueOnce(unsubscribe3);

      const controller = createUIController(deps);
      controller.destroy();

      expect(unsubscribe1).toHaveBeenCalled();
      expect(unsubscribe2).toHaveBeenCalled();
      expect(unsubscribe3).toHaveBeenCalled();
    });
  });
});
