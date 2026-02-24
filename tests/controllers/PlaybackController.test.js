import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaybackController } from '../../src/controllers/PlaybackController.js';

function createMockDeps() {
  return {
    audioEngine: {
      audioContext: { currentTime: 0 },
      sampleRate: 48000,
      start: vi.fn().mockResolvedValue(),
      pause: vi.fn(),
      resume: vi.fn().mockResolvedValue(),
      stop: vi.fn(),
      getAnalysisData: vi.fn(() => ({
        frequencyData: new Uint8Array(1024),
        timeData: new Uint8Array(2048),
      })),
    },
    audioAnalyzer: {
      analyze: vi.fn(),
      getValues: vi.fn(() => ({
        kick: 0.5,
        hihat: 0.3,
        bass: 0.4,
        kickPeak: 0.6,
        hihatPeak: 0.4,
        bassPeak: 0.5,
        kickOnset: 0,
        hihatOnset: 0,
        bassOnset: 0,
      })),
    },
    audioScheduler: {
      requestInitialBuffer: vi.fn().mockResolvedValue(new Float32Array(1024)),
      requestNextBuffer: vi.fn().mockResolvedValue(new Float32Array(1024)),
      reset: vi.fn(),
    },
    playbackState: {
      isPlaying: false,
      isPaused: false,
      pausedReadPos: 0,
      setPlaying: vi.fn(),
      recordStartTime: vi.fn(),
      recordPauseTime: vi.fn(),
      reset: vi.fn(),
      getCurrentTime: vi.fn(() => 0),
    },
    audioSettings: {
      volume: 0.5,
      getSamplesPerBar: vi.fn(() => 48000),
    },
    visualRenderer: {
      render: vi.fn(),
      resizeCanvas: vi.fn(),
    },
    eventBus: {
      emit: vi.fn(),
      on: vi.fn(() => vi.fn()),
    },
    errorHandler: vi.fn(),
  };
}

describe('PlaybackController', () => {
  let rafCallbacks = [];
  let rafId = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    rafCallbacks = [];
    rafId = 0;

    vi.stubGlobal('requestAnimationFrame', (cb) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('togglePlayback', () => {
    it('should start playback when stopped', async () => {
      const deps = createMockDeps();
      const controller = createPlaybackController(deps);

      await controller.togglePlayback();

      expect(deps.audioScheduler.requestInitialBuffer).toHaveBeenCalled();
      expect(deps.audioEngine.start).toHaveBeenCalled();
      expect(deps.playbackState.setPlaying).toHaveBeenCalledWith(true, false);
    });

    it('should call errorHandler on failure', async () => {
      const deps = createMockDeps();
      const error = new Error('Buffer generation failed');
      deps.audioScheduler.requestInitialBuffer.mockRejectedValue(error);
      const controller = createPlaybackController(deps);

      await controller.togglePlayback();

      expect(deps.errorHandler).toHaveBeenCalledWith(error);
    });
  });

  describe('resetPlayback', () => {
    it('should stop audio and reset state', () => {
      const deps = createMockDeps();
      const controller = createPlaybackController(deps);

      controller.resetPlayback();

      expect(deps.audioEngine.stop).toHaveBeenCalled();
      expect(deps.audioScheduler.reset).toHaveBeenCalled();
      expect(deps.playbackState.reset).toHaveBeenCalled();
    });

    it('should call errorHandler on failure', () => {
      const deps = createMockDeps();
      const error = new Error('Stop failed');
      deps.audioEngine.stop.mockImplementation(() => {
        throw error;
      });
      const controller = createPlaybackController(deps);

      controller.resetPlayback();

      expect(deps.errorHandler).toHaveBeenCalledWith(error);
    });
  });

  describe('startAnimationLoop', () => {
    it('should request animation frame', () => {
      const deps = createMockDeps();
      const controller = createPlaybackController(deps);

      controller.startAnimationLoop();

      expect(rafCallbacks.length).toBe(1);
    });

    it('should handle null analysis data', () => {
      const deps = createMockDeps();
      deps.playbackState.isPlaying = true;
      deps.audioEngine.getAnalysisData.mockReturnValue(null);
      const controller = createPlaybackController(deps);

      controller.startAnimationLoop();
      rafCallbacks[0]();

      expect(deps.audioAnalyzer.analyze).not.toHaveBeenCalled();
      expect(deps.visualRenderer.render).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should cancel animation frame', () => {
      const deps = createMockDeps();
      const controller = createPlaybackController(deps);

      controller.startAnimationLoop();
      controller.destroy();

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
  });
});
