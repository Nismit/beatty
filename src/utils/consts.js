/**
 * Application constants
 * Centralized configuration values to avoid magic numbers
 */

export const APP = {
  STATUS_UPDATE_INTERVAL: 100,
};

export const AUDIO = {
  SAMPLE_RATE: 48000,
  DEFAULT_BPM: 120,
  DEFAULT_VOLUME: 0.3,
  FFT_SIZE: 2048,
  SMOOTHING_TIME_CONSTANT: 0.6,
  MIN_DECIBELS: -80,
  MAX_DECIBELS: -20,
  SAMPLES_PER_BAR_MULTIPLIER: 240,
  STEREO: 2,
  BYTES_PER_SAMPLE: 4, // Float32Array.BYTES_PER_ELEMENT
};

export const ANALYSIS = {
  EMA_ALPHA: 0.3,
  PEAK_DECAY: 0.95,
  ONSET_THRESHOLD: 0.15,
  NORM_DECAY: 0.999,
  RING_BUFFER_SIZE: 8,
  MIN_MAX_VALUE: 0.001,
  HISTORY_LENGTH: 5,
  WEIGHT: {
    BAND: 0.6,
    PEAK: 0.4,
    ENERGY: 0.7,
    RMS: 0.3,
  },
  DEFAULT_FREQ_RANGES: {
    KICK: [20, 80],
    HIHAT: [5000, 12000],
    BASS: [100, 300],
  },
};

export const WEBGL = {
  TRANSFORM_FEEDBACK_VARYINGS: ['v_audioSample'],
  CLEAR_COLOR: [0.0, 0.0, 0.0, 1.0],
};

export const UI = {
  EDITOR_MODES: {
    SOUND: 'sound',
    VISUAL: 'visual',
  },
  STATUS_TYPES: {
    INITIALIZING: 'initializing',
    READY: 'ready',
    ERROR: 'error',
    COMPILING: 'compiling',
    COMPILED: 'compiled',
    APPLIED: 'applied',
  },
};

export const STORAGE_KEYS = {
  SOUND_SHADER: 'beatty_sound_shader',
  VISUAL_SHADER: 'beatty_visual_shader',
  SETTINGS: 'beatty_settings',
  PRESETS: 'beatty_presets',
};

export const PRESET = {
  MAX_COUNT: 20,
  DEFAULT_NAME: 'Default',
  STORAGE_VERSION: 1,
};

export const EVENTS = {
  // Playback
  PLAY_STATE_CHANGED: 'playback:stateChanged',
  PLAYBACK_RESET: 'playback:reset',

  // Audio Settings
  BPM_CHANGED: 'settings:bpmChanged',
  BPM_CHANGE_BLOCKED: 'settings:bpmChangeBlocked',
  VOLUME_CHANGED: 'settings:volumeChanged',

  // Audio Buffer
  BUFFER_READY: 'audio:bufferReady',
  BUFFER_REQUESTED: 'audio:bufferRequested',

  // Shader
  SHADER_COMPILE_START: 'shader:compileStart',
  SHADER_COMPILE_SUCCESS: 'shader:compileSuccess',
  SHADER_COMPILE_ERROR: 'shader:compileError',
  SHADER_APPLIED: 'shader:applied',
  SHADER_IMPORTED: 'shader:imported',

  // Editor
  EDITOR_MODE_CHANGED: 'editor:modeChanged',
  EDITOR_VISIBILITY_CHANGED: 'editor:visibilityChanged',

  // UI
  STATUS_UPDATE: 'ui:statusUpdate',

  // Presets
  PRESET_SAVED: 'preset:saved',
  PRESET_LOADED: 'preset:loaded',
  PRESET_DELETED: 'preset:deleted',
  PRESET_IMPORTED: 'preset:imported',
};
