import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAudioSettings } from '../../src/state/AudioSettings.js';
import { AUDIO, EVENTS } from '../../src/utils/consts.js';

function createMockEventBus() {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

describe('AudioSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should use default values when no saved settings', () => {
      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      expect(audioSettings.bpm).toBe(AUDIO.DEFAULT_BPM);
      expect(audioSettings.volume).toBe(AUDIO.DEFAULT_VOLUME);
      expect(audioSettings.sampleRate).toBe(AUDIO.SAMPLE_RATE);
    });

    it('should load saved settings from localStorage', () => {
      const savedSettings = {
        bpm: 140,
        volume: 0.8,
        timestamp: Date.now(),
        version: '1.0',
      };
      localStorage.setItem('beatty_settings', JSON.stringify(savedSettings));

      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      expect(audioSettings.bpm).toBe(140);
      expect(audioSettings.volume).toBe(0.8);
    });
  });

  describe('setBpm', () => {
    it('should update BPM value', () => {
      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      audioSettings.setBpm(150);

      expect(audioSettings.bpm).toBe(150);
    });

    it('should emit BPM_CHANGED event with old and new values', () => {
      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      audioSettings.setBpm(140);

      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.BPM_CHANGED, {
        old: AUDIO.DEFAULT_BPM,
        new: 140,
      });
    });

    it('should persist settings to localStorage', () => {
      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      audioSettings.setBpm(160);

      const stored = JSON.parse(localStorage.getItem('beatty_settings'));
      expect(stored.bpm).toBe(160);
    });
  });

  describe('setVolume', () => {
    it('should update volume value', () => {
      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      audioSettings.setVolume(0.75);

      expect(audioSettings.volume).toBe(0.75);
    });

    it('should emit VOLUME_CHANGED event with old and new values', () => {
      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      audioSettings.setVolume(0.5);

      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.VOLUME_CHANGED, {
        old: AUDIO.DEFAULT_VOLUME,
        new: 0.5,
      });
    });

    it('should persist settings to localStorage', () => {
      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      audioSettings.setVolume(0.9);

      const stored = JSON.parse(localStorage.getItem('beatty_settings'));
      expect(stored.volume).toBe(0.9);
    });
  });

  describe('setSampleRate', () => {
    it('should update sample rate', () => {
      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      audioSettings.setSampleRate(44100);

      expect(audioSettings.sampleRate).toBe(44100);
    });

    it('should not persist sample rate (runtime only)', () => {
      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      audioSettings.setSampleRate(44100);

      const stored = localStorage.getItem('beatty_settings');
      // Should not have been saved just for sample rate change
      expect(stored).toBeNull();
    });
  });

  describe('getSamplesPerBar', () => {
    it('should calculate samples per bar correctly', () => {
      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      // Formula: (240 * sampleRate) / bpm
      // Default: (240 * 48000) / 120 = 96000
      expect(audioSettings.getSamplesPerBar()).toBe(96000);
    });

    it('should update when BPM changes', () => {
      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      audioSettings.setBpm(60);
      // (240 * 48000) / 60 = 192000
      expect(audioSettings.getSamplesPerBar()).toBe(192000);
    });

    it('should update when sample rate changes', () => {
      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      audioSettings.setSampleRate(44100);
      // (240 * 44100) / 120 = 88200
      expect(audioSettings.getSamplesPerBar()).toBe(88200);
    });
  });

  describe('destroy', () => {
    it('should not throw when called', () => {
      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      expect(() => audioSettings.destroy()).not.toThrow();
    });
  });

  describe('persistence edge cases', () => {
    it('should handle partial saved settings (bpm only)', () => {
      const savedSettings = {
        bpm: 130,
        timestamp: Date.now(),
        version: '1.0',
      };
      localStorage.setItem('beatty_settings', JSON.stringify(savedSettings));

      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      expect(audioSettings.bpm).toBe(130);
      expect(audioSettings.volume).toBe(AUDIO.DEFAULT_VOLUME);
    });

    it('should handle partial saved settings (volume only)', () => {
      const savedSettings = {
        volume: 0.6,
        timestamp: Date.now(),
        version: '1.0',
      };
      localStorage.setItem('beatty_settings', JSON.stringify(savedSettings));

      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      expect(audioSettings.bpm).toBe(AUDIO.DEFAULT_BPM);
      expect(audioSettings.volume).toBe(0.6);
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('beatty_settings', 'not valid json');

      const eventBus = createMockEventBus();
      const audioSettings = createAudioSettings(eventBus);

      // Should fall back to defaults
      expect(audioSettings.bpm).toBe(AUDIO.DEFAULT_BPM);
      expect(audioSettings.volume).toBe(AUDIO.DEFAULT_VOLUME);
    });
  });
});
