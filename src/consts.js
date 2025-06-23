export const APP = {
  STATUS_UPDATE_INTERVAL: 100,
}

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
};

export const WEBGL_CONSTANTS = {
  TRANSFORM_FEEDBACK_VARYINGS: ['v_audioSample'],
  CLEAR_COLOR: [0.0, 0.0, 0.0, 1.0]
};

export const UI_CONSTANTS = {
  EDITOR_MODES: {
    SOUND: 'sound',
    VISUAL: 'visual'
  },
  STATUS_TYPES: {
    READY: 'ready',
    ERROR: 'error',
    SUCCESS: 'success',
    COMPILING: 'compiling'
  }
};