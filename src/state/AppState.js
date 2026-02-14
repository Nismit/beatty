import { AUDIO } from '../utils/consts.js';
import { loadSettings, saveSettings } from '../utils/storage.js';

export class AppState {
  constructor() {
    // Load saved settings
    const savedSettings = loadSettings();

    // Audio state
    this.bpm = savedSettings?.bpm ?? AUDIO.DEFAULT_BPM;
    this.volume = savedSettings?.volume ?? AUDIO.DEFAULT_VOLUME;
    this.sampleRate = AUDIO.SAMPLE_RATE;
    this.isPlaying = false;
    this.isPaused = false;

    // Timing state
    this.currentBars = 0;
    this.currentBlockOffset = 0;
    this.startTime = 0;
    this.totalElapsedTime = 0;
    this.pausedReadPos = 0;

    // Compilation state
    this.isCompiled = false;
    this.pendingApply = false;

    // Event listeners for state changes
    this.listeners = new Map();

    this.audioContext = null;
  }

  setAudioContext(audioContext) {
    this.audioContext = audioContext;
    this.sampleRate = audioContext.sampleRate;
  }

  // State getters
  getSamplesPer1Bar() {
    return Math.floor((AUDIO.SAMPLES_PER_BAR_MULTIPLIER * this.sampleRate) / this.bpm);
  }

  // State setters with event emission
  setBpm(newBpm) {
    const oldBpm = this.bpm;
    this.bpm = newBpm;
    this.emit('bpmChanged', { old: oldBpm, new: newBpm });
    this.persistSettings();
  }

  setVolume(newVolume) {
    const oldVolume = this.volume;
    this.volume = newVolume;
    this.emit('volumeChanged', { old: oldVolume, new: newVolume });
    this.persistSettings();
  }

  // Persist current settings to LocalStorage
  persistSettings() {
    saveSettings({ volume: this.volume, bpm: this.bpm });
  }

  setPlayState(isPlaying, isPaused = false) {
    const oldState = { isPlaying: this.isPlaying, isPaused: this.isPaused };
    this.isPlaying = isPlaying;
    this.isPaused = isPaused;
    this.emit('playStateChanged', { old: oldState, new: { isPlaying, isPaused } });
  }

  getCurrentTime() {
    if (!this.isPlaying || !this.audioContext) return this.totalElapsedTime;

    const currentTime = this.audioContext.currentTime;
    const elapsedSinceStart = currentTime - this.startTime;
    return this.totalElapsedTime + elapsedSinceStart;
  }

  recordStartTime() {
    if (this.audioContext) {
      this.startTime = this.audioContext.currentTime;
    }
  }

  recordPauseTime() {
    if (this.startTime && this.audioContext) {
      const currentTime = this.audioContext.currentTime;
      this.totalElapsedTime += currentTime - this.startTime;
    }

    const elapsedSamples = Math.floor(this.totalElapsedTime * this.sampleRate);
    const samplesPerBar = this.getSamplesPer1Bar();
    this.pausedReadPos = elapsedSamples % samplesPerBar;
  }

  resetTiming() {
    this.currentBars = 0;
    this.currentBlockOffset = 0;
    this.startTime = 0;
    this.totalElapsedTime = 0;
    this.pausedReadPos = 0;
  }

  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        callback(data);
      }
    }
  }
}
