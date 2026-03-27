import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStatusDisplay } from '../../src/ui/StatusDisplay.js';
import { EVENTS, UI } from '../../src/utils/consts.js';

function createMockDeps() {
  return {
    eventBus: {
      on: vi.fn(() => vi.fn()),
      emit: vi.fn(),
    },
    playbackState: {
      isPlaying: false,
    },
    audioSettings: {
      bpm: 120,
      volume: 0.5,
    },
    getCurrentTime: vi.fn(() => 0),
  };
}

function setupDOM() {
  document.body.innerHTML = `
    <div id="tabBar"></div>
    <div id="errorBar"></div>
    <span id="bpmValue"></span>
    <span id="statusBpm"></span>
    <span id="volumeValue"></span>
    <span id="statusVolume"></span>
    <span id="statusBars"></span>
    <input id="bpmSlider" type="range" />
    <input id="volumeSlider" type="range" />
  `;
}

describe('StatusDisplay', () => {
  beforeEach(() => {
    setupDOM();
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('event subscriptions', () => {
    it('should subscribe to BPM and volume change events', () => {
      const deps = createMockDeps();
      createStatusDisplay(deps);

      expect(deps.eventBus.on).toHaveBeenCalledWith(EVENTS.BPM_CHANGED, expect.any(Function));
      expect(deps.eventBus.on).toHaveBeenCalledWith(EVENTS.VOLUME_CHANGED, expect.any(Function));
    });

    it('should update BPM display when BPM_CHANGED event fires', () => {
      const deps = createMockDeps();
      let bpmHandler;
      deps.eventBus.on.mockImplementation((event, handler) => {
        if (event === EVENTS.BPM_CHANGED) bpmHandler = handler;
        return vi.fn();
      });

      createStatusDisplay(deps);
      bpmHandler({ new: 140 });

      expect(document.getElementById('statusBpm').textContent).toBe('140');
      expect(document.getElementById('bpmValue').textContent).toBe('140');
    });

    it('should update volume display when VOLUME_CHANGED event fires', () => {
      const deps = createMockDeps();
      let volumeHandler;
      deps.eventBus.on.mockImplementation((event, handler) => {
        if (event === EVENTS.VOLUME_CHANGED) volumeHandler = handler;
        return vi.fn();
      });

      createStatusDisplay(deps);
      volumeHandler({ new: 0.75 });

      expect(document.getElementById('statusVolume').textContent).toBe('75');
      expect(document.getElementById('volumeValue').textContent).toBe('75%');
    });
  });

  describe('showStatus', () => {
    it('should add status class to tabBar', () => {
      const deps = createMockDeps();
      const display = createStatusDisplay(deps);

      display.showStatus(null, UI.STATUS_TYPES.COMPILING);

      const tabBar = document.getElementById('tabBar');
      expect(tabBar.classList.contains('compiling')).toBe(true);
    });

    it('should remove previous status classes before adding new one', () => {
      const deps = createMockDeps();
      const display = createStatusDisplay(deps);

      display.showStatus(null, UI.STATUS_TYPES.COMPILING);
      display.showStatus(null, UI.STATUS_TYPES.COMPILED);

      const tabBar = document.getElementById('tabBar');
      expect(tabBar.classList.contains('compiling')).toBe(false);
      expect(tabBar.classList.contains('compiled')).toBe(true);
    });

    it('should clear error bar on non-error status', () => {
      const deps = createMockDeps();
      const display = createStatusDisplay(deps);

      display.showError('Test error');
      display.showStatus(null, UI.STATUS_TYPES.READY);

      const errorBar = document.getElementById('errorBar');
      expect(errorBar.classList.contains('visible')).toBe(false);
    });

    it('should handle missing tabBar gracefully', () => {
      document.getElementById('tabBar').remove();
      const deps = createMockDeps();
      const display = createStatusDisplay(deps);

      expect(() => display.showStatus(null, UI.STATUS_TYPES.READY)).not.toThrow();
    });
  });

  describe('showError', () => {
    it('should display error message in error bar', () => {
      const deps = createMockDeps();
      const display = createStatusDisplay(deps);

      display.showError('Shader compilation failed');

      const errorBar = document.getElementById('errorBar');
      expect(errorBar.textContent).toBe('Shader compilation failed');
      expect(errorBar.classList.contains('visible')).toBe(true);
    });

    it('should set error status on tabBar', () => {
      const deps = createMockDeps();
      const display = createStatusDisplay(deps);

      display.showError('Test error');

      const tabBar = document.getElementById('tabBar');
      expect(tabBar.classList.contains('error')).toBe(true);
    });
  });

  describe('clearError', () => {
    it('should hide error bar and clear message', () => {
      const deps = createMockDeps();
      const display = createStatusDisplay(deps);

      display.showError('Test error');
      display.clearError();

      const errorBar = document.getElementById('errorBar');
      expect(errorBar.classList.contains('visible')).toBe(false);
      expect(errorBar.textContent).toBe('');
    });
  });

  describe('init', () => {
    it('should initialize BPM and volume displays', () => {
      const deps = createMockDeps();
      deps.audioSettings.bpm = 140;
      deps.audioSettings.volume = 0.8;

      const display = createStatusDisplay(deps);
      display.init();

      expect(document.getElementById('statusBpm').textContent).toBe('140');
      expect(document.getElementById('statusVolume').textContent).toBe('80');
    });
  });

  describe('startUpdates / stopUpdates', () => {
    it('should start periodic updates', () => {
      const deps = createMockDeps();
      deps.playbackState.isPlaying = true;
      deps.getCurrentTime.mockReturnValue(4);
      deps.audioSettings.bpm = 120;

      const display = createStatusDisplay(deps);
      display.startUpdates();

      vi.advanceTimersByTime(100);

      expect(document.getElementById('statusBars').textContent).toBe('2');
    });

    it('should stop updates when stopUpdates is called', () => {
      const deps = createMockDeps();
      deps.playbackState.isPlaying = true;
      deps.getCurrentTime.mockReturnValue(4);
      deps.audioSettings.bpm = 120;

      const display = createStatusDisplay(deps);
      display.startUpdates();

      vi.advanceTimersByTime(100);
      expect(document.getElementById('statusBars').textContent).toBe('2');

      display.stopUpdates();
      deps.getCurrentTime.mockReturnValue(8);
      vi.advanceTimersByTime(100);

      // Value should remain unchanged after stopUpdates
      expect(document.getElementById('statusBars').textContent).toBe('2');
    });

    it('should not update bars when not playing', () => {
      const deps = createMockDeps();
      deps.playbackState.isPlaying = false;

      const display = createStatusDisplay(deps);
      display.startUpdates();

      vi.advanceTimersByTime(100);

      expect(document.getElementById('statusBars').textContent).toBe('');
    });
  });

  describe('destroy', () => {
    it('should stop updates and unsubscribe from events', () => {
      const unsubscribe = vi.fn();
      const deps = createMockDeps();
      deps.eventBus.on.mockReturnValue(unsubscribe);

      const display = createStatusDisplay(deps);
      display.startUpdates();
      display.destroy();

      expect(unsubscribe).toHaveBeenCalledTimes(2);
    });
  });
});
