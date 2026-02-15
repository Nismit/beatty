import { describe, expect, it, vi } from 'vitest';
import { createPlaybackState } from '../../src/state/PlaybackState.js';
import { EVENTS } from '../../src/utils/consts.js';

function createMockEventBus() {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

describe('PlaybackState', () => {
  describe('initial state', () => {
    it('should have correct initial values', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      expect(playbackState.isPlaying).toBe(false);
      expect(playbackState.isPaused).toBe(false);
      expect(playbackState.blockOffset).toBe(0);
      expect(playbackState.totalElapsedTime).toBe(0);
      expect(playbackState.pausedReadPos).toBe(0);
    });
  });

  describe('setPlaying', () => {
    it('should emit event when play state changes', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      playbackState.setPlaying(true);

      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.PLAY_STATE_CHANGED, {
        isPlaying: true,
        isPaused: false,
      });
    });

    it('should update isPlaying state', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      playbackState.setPlaying(true);
      expect(playbackState.isPlaying).toBe(true);

      playbackState.setPlaying(false);
      expect(playbackState.isPlaying).toBe(false);
    });

    it('should support paused state', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      playbackState.setPlaying(false, true);

      expect(playbackState.isPlaying).toBe(false);
      expect(playbackState.isPaused).toBe(true);
      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.PLAY_STATE_CHANGED, {
        isPlaying: false,
        isPaused: true,
      });
    });
  });

  describe('advanceBlock', () => {
    it('should advance block offset by specified seconds', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      playbackState.advanceBlock(2.0);
      expect(playbackState.blockOffset).toBe(2.0);

      playbackState.advanceBlock(1.5);
      expect(playbackState.blockOffset).toBe(3.5);
    });
  });

  describe('recordStartTime', () => {
    it('should record start time for elapsed calculation', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      playbackState.recordStartTime(10.0);
      // Internal state, verify through getCurrentTime behavior
      const mockAudioContext = { currentTime: 12.0 };
      playbackState.setPlaying(true);

      expect(playbackState.getCurrentTime(mockAudioContext)).toBe(2.0);
    });
  });

  describe('recordPauseTime', () => {
    it('should accumulate elapsed time when pausing', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      playbackState.recordStartTime(5.0);
      playbackState.setPlaying(true);
      playbackState.recordPauseTime(8.0, 96000);

      expect(playbackState.totalElapsedTime).toBe(3.0);
    });

    it('should calculate pausedReadPos correctly', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      playbackState.recordStartTime(0);
      playbackState.setPlaying(true);
      playbackState.recordPauseTime(1.0, 48000);

      // 1 second at 48000 sample rate = 48000 samples
      // 48000 % 48000 = 0
      expect(playbackState.pausedReadPos).toBe(0);
    });
  });

  describe('getCurrentTime', () => {
    it('should return totalElapsedTime when not playing', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);
      const mockAudioContext = { currentTime: 10.0 };

      expect(playbackState.getCurrentTime(mockAudioContext)).toBe(0);
    });

    it('should return totalElapsedTime when audioContext is null', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      playbackState.setPlaying(true);

      expect(playbackState.getCurrentTime(null)).toBe(0);
    });

    it('should calculate current time based on audioContext when playing', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      playbackState.recordStartTime(5.0);
      playbackState.setPlaying(true);

      const mockAudioContext = { currentTime: 7.5 };
      expect(playbackState.getCurrentTime(mockAudioContext)).toBe(2.5);
    });
  });

  describe('reset', () => {
    it('should reset all state values', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      // Modify state
      playbackState.setPlaying(true);
      playbackState.advanceBlock(5.0);
      playbackState.recordStartTime(10.0);

      // Reset
      playbackState.reset();

      expect(playbackState.isPlaying).toBe(false);
      expect(playbackState.isPaused).toBe(false);
      expect(playbackState.blockOffset).toBe(0);
      expect(playbackState.totalElapsedTime).toBe(0);
      expect(playbackState.pausedReadPos).toBe(0);
    });

    it('should emit PLAYBACK_RESET event', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      playbackState.reset();

      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.PLAYBACK_RESET);
    });
  });

  describe('destroy', () => {
    it('should reset state on destroy', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      playbackState.setPlaying(true);
      playbackState.advanceBlock(3.0);
      playbackState.destroy();

      expect(playbackState.isPlaying).toBe(false);
      expect(playbackState.blockOffset).toBe(0);
    });
  });

  describe('input validation', () => {
    it('should throw TypeError for non-number advanceBlock', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      expect(() => playbackState.advanceBlock('5')).toThrow(TypeError);
      expect(() => playbackState.advanceBlock(null)).toThrow(TypeError);
      expect(() => playbackState.advanceBlock(NaN)).toThrow(TypeError);
    });

    it('should throw RangeError for non-positive advanceBlock', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      expect(() => playbackState.advanceBlock(0)).toThrow(RangeError);
      expect(() => playbackState.advanceBlock(-1)).toThrow(RangeError);
    });

    it('should throw TypeError for non-number recordStartTime', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      expect(() => playbackState.recordStartTime('10')).toThrow(TypeError);
      expect(() => playbackState.recordStartTime(null)).toThrow(TypeError);
      expect(() => playbackState.recordStartTime(NaN)).toThrow(TypeError);
    });

    it('should throw RangeError for negative recordStartTime', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      expect(() => playbackState.recordStartTime(-1)).toThrow(RangeError);
    });

    it('should accept zero for recordStartTime', () => {
      const eventBus = createMockEventBus();
      const playbackState = createPlaybackState(eventBus);

      expect(() => playbackState.recordStartTime(0)).not.toThrow();
    });
  });
});
