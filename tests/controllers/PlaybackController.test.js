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

    // Mock requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', (cb) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id) => {
      // Just track that it was called
    });
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
      expect(deps.playbackState.recordStartTime).toHaveBeenCalled();
      expect(deps.playbackState.setPlaying).toHaveBeenCalledWith(true, false);
      expect(deps.audioScheduler.requestNextBuffer).toHaveBeenCalled();
    });

    it('should pause playback when playing', async () => {
      const deps = createMockDeps();
      deps.playbackState.isPlaying = true;
      const controller = createPlaybackController(deps);

      await controller.togglePlayback();

      expect(deps.audioEngine.pause).toHaveBeenCalled();
      expect(deps.playbackState.recordPauseTime).toHaveBeenCalled();
      expect(deps.playbackState.setPlaying).toHaveBeenCalledWith(false, true);
    });

    it('should resume playback when paused', async () => {
      const deps = createMockDeps();
      deps.playbackState.isPlaying = false;
      deps.playbackState.isPaused = true;
      deps.playbackState.pausedReadPos = 1000;
      const controller = createPlaybackController(deps);

      await controller.togglePlayback();

      expect(deps.audioEngine.resume).toHaveBeenCalledWith(deps.audioSettings.volume, 1000);
      expect(deps.playbackState.recordStartTime).toHaveBeenCalled();
      expect(deps.playbackState.setPlaying).toHaveBeenCalledWith(true, false);
    });

    it('should handle errors and call errorHandler', async () => {
      const deps = createMockDeps();
      const error = new Error('Audio start failed');
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

    it('should handle errors', () => {
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
    it('should start rendering loop', () => {
      const deps = createMockDeps();
      const controller = createPlaybackController(deps);

      controller.startAnimationLoop();

      // First frame should have been requested
      expect(rafCallbacks.length).toBe(1);

      // Execute the callback to trigger render
      rafCallbacks[0]();

      expect(deps.visualRenderer.render).toHaveBeenCalled();
    });

    it('should analyze audio when playing', () => {
      const deps = createMockDeps();
      deps.playbackState.isPlaying = true;
      const controller = createPlaybackController(deps);

      controller.startAnimationLoop();
      rafCallbacks[0]();

      expect(deps.audioEngine.getAnalysisData).toHaveBeenCalled();
      expect(deps.audioAnalyzer.analyze).toHaveBeenCalled();
    });

    it('should not analyze audio when not playing', () => {
      const deps = createMockDeps();
      deps.playbackState.isPlaying = false;
      const controller = createPlaybackController(deps);

      controller.startAnimationLoop();
      rafCallbacks[0]();

      expect(deps.audioAnalyzer.analyze).not.toHaveBeenCalled();
    });
  });

  describe('stopAnimationLoop', () => {
    it('should cancel animation frame', () => {
      const deps = createMockDeps();
      const controller = createPlaybackController(deps);

      controller.startAnimationLoop();
      controller.stopAnimationLoop();

      // Should be able to call multiple times without error
      controller.stopAnimationLoop();
    });
  });

  describe('handleResize', () => {
    it('should call visualRenderer.resizeCanvas', () => {
      const deps = createMockDeps();
      const controller = createPlaybackController(deps);

      controller.handleResize();

      expect(deps.visualRenderer.resizeCanvas).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should stop animation loop', () => {
      const deps = createMockDeps();
      const controller = createPlaybackController(deps);

      controller.startAnimationLoop();
      controller.destroy();

      // Verify cleanup happened (no errors on multiple calls)
      controller.destroy();
    });
  });
});
