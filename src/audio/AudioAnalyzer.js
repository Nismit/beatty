/**
 * AudioAnalyzer class
 * Handles frequency analysis, audio feature extraction, and smoothing
 * Features: Ring buffer smoothing, EMA, peak detection, spectral flux, adaptive normalization
 */

import { ANALYSIS } from '../utils/consts.js';

/**
 * Ring Buffer for O(1) moving average calculation
 */
class RingBuffer {
  #buffer;
  #size;
  #index;
  #filled;
  #sum;

  constructor(size) {
    this.#size = size;
    this.#buffer = new Float32Array(size);
    this.#index = 0;
    this.#filled = 0;
    this.#sum = 0;
  }

  push(value) {
    this.#sum -= this.#buffer[this.#index];
    this.#buffer[this.#index] = value;
    this.#sum += value;
    this.#index = (this.#index + 1) % this.#size;
    if (this.#filled < this.#size) this.#filled++;
  }

  average() {
    return this.#filled > 0 ? this.#sum / this.#filled : 0;
  }

  reset() {
    this.#buffer.fill(0);
    this.#index = 0;
    this.#filled = 0;
    this.#sum = 0;
  }
}

export class AudioAnalyzer {
  #kickFreqRange;
  #hihatFreqRange;
  #bassFreqRange;

  #emaAlpha;
  #peakDecay;
  #onsetThreshold;
  #normDecay;

  // Current values
  #kickRaw;
  #hihatRaw;
  #bassRaw;
  #kickValue;
  #hihatValue;
  #bassValue;
  #kickPeak;
  #hihatPeak;
  #bassPeak;
  #kickFlux;
  #hihatFlux;
  #bassFlux;
  #prevKick;
  #prevHihat;
  #prevBass;

  // Ring buffers
  #kickBuffer;
  #hihatBuffer;
  #bassBuffer;

  // Adaptive normalization
  #kickMax;
  #hihatMax;
  #bassMax;

  /**
   * @param {Object} [options]
   * @param {number[]} [options.kickFreqRange]
   * @param {number[]} [options.hihatFreqRange]
   * @param {number[]} [options.bassFreqRange]
   * @param {number} [options.historyLength]
   * @param {number} [options.emaAlpha]
   * @param {number} [options.peakDecay]
   * @param {number} [options.onsetThreshold]
   */
  constructor(options = {}) {
    this.#kickFreqRange = options.kickFreqRange || ANALYSIS.DEFAULT_FREQ_RANGES.KICK;
    this.#hihatFreqRange = options.hihatFreqRange || ANALYSIS.DEFAULT_FREQ_RANGES.HIHAT;
    this.#bassFreqRange = options.bassFreqRange || ANALYSIS.DEFAULT_FREQ_RANGES.BASS;

    this.#emaAlpha = options.emaAlpha ?? ANALYSIS.EMA_ALPHA;
    this.#peakDecay = options.peakDecay ?? ANALYSIS.PEAK_DECAY;
    this.#onsetThreshold = options.onsetThreshold ?? ANALYSIS.ONSET_THRESHOLD;
    this.#normDecay = ANALYSIS.NORM_DECAY;

    const historyLength = options.historyLength ?? ANALYSIS.RING_BUFFER_SIZE;
    this.#kickBuffer = new RingBuffer(historyLength);
    this.#hihatBuffer = new RingBuffer(historyLength);
    this.#bassBuffer = new RingBuffer(historyLength);

    this.#initValues();
  }

  #initValues() {
    this.#kickRaw = 0;
    this.#hihatRaw = 0;
    this.#bassRaw = 0;
    this.#kickValue = 0;
    this.#hihatValue = 0;
    this.#bassValue = 0;
    this.#kickPeak = 0;
    this.#hihatPeak = 0;
    this.#bassPeak = 0;
    this.#kickFlux = 0;
    this.#hihatFlux = 0;
    this.#bassFlux = 0;
    this.#prevKick = 0;
    this.#prevHihat = 0;
    this.#prevBass = 0;
    this.#kickMax = ANALYSIS.MIN_MAX_VALUE;
    this.#hihatMax = ANALYSIS.MIN_MAX_VALUE;
    this.#bassMax = ANALYSIS.MIN_MAX_VALUE;
  }

  /**
   * Analyze frequency and time domain data
   * @param {Uint8Array} frequencyData
   * @param {Uint8Array} timeData
   * @param {number} sampleRate
   */
  analyze(frequencyData, timeData, sampleRate) {
    if (!frequencyData || !timeData) return;

    const binCount = frequencyData.length;
    const freqPerBin = sampleRate / (2 * binCount);

    // Extract raw band energies
    this.#kickRaw = this.#extractBandEnergy(frequencyData, freqPerBin, this.#kickFreqRange);
    this.#hihatRaw = this.#extractBandEnergy(frequencyData, freqPerBin, this.#hihatFreqRange);
    this.#bassRaw = this.#extractBandEnergyWithRMS(
      frequencyData,
      timeData,
      freqPerBin,
      this.#bassFreqRange,
    );

    // Spectral flux (onset detection)
    this.#kickFlux = Math.max(0, this.#kickRaw - this.#prevKick);
    this.#hihatFlux = Math.max(0, this.#hihatRaw - this.#prevHihat);
    this.#bassFlux = Math.max(0, this.#bassRaw - this.#prevBass);

    // Adaptive normalization
    this.#kickMax = Math.max(
      this.#kickMax * this.#normDecay,
      this.#kickRaw,
      ANALYSIS.MIN_MAX_VALUE,
    );
    this.#hihatMax = Math.max(
      this.#hihatMax * this.#normDecay,
      this.#hihatRaw,
      ANALYSIS.MIN_MAX_VALUE,
    );
    this.#bassMax = Math.max(
      this.#bassMax * this.#normDecay,
      this.#bassRaw,
      ANALYSIS.MIN_MAX_VALUE,
    );

    // Normalized ring buffer + EMA
    this.#kickBuffer.push(this.#kickRaw / this.#kickMax);
    this.#hihatBuffer.push(this.#hihatRaw / this.#hihatMax);
    this.#bassBuffer.push(this.#bassRaw / this.#bassMax);

    this.#kickValue = this.#ema(this.#kickValue, this.#kickBuffer.average());
    this.#hihatValue = this.#ema(this.#hihatValue, this.#hihatBuffer.average());
    this.#bassValue = this.#ema(this.#bassValue, this.#bassBuffer.average());

    // Peak decay
    this.#kickPeak = Math.max(this.#kickPeak * this.#peakDecay, this.#kickValue);
    this.#hihatPeak = Math.max(this.#hihatPeak * this.#peakDecay, this.#hihatValue);
    this.#bassPeak = Math.max(this.#bassPeak * this.#peakDecay, this.#bassValue);

    // Store for next frame
    this.#prevKick = this.#kickRaw;
    this.#prevHihat = this.#hihatRaw;
    this.#prevBass = this.#bassRaw;
  }

  /**
   * Extract energy from a frequency band
   * @param {Uint8Array} frequencyData
   * @param {number} freqPerBin
   * @param {number[]} range - [startFreq, endFreq]
   * @returns {number} Band energy (0-1)
   */
  #extractBandEnergy(frequencyData, freqPerBin, range) {
    const startBin = Math.max(0, Math.floor(range[0] / freqPerBin));
    const endBin = Math.min(frequencyData.length - 1, Math.floor(range[1] / freqPerBin));

    if (endBin <= startBin) return 0;

    let sum = 0;
    let peak = 0;
    for (let i = startBin; i <= endBin; i++) {
      const value = frequencyData[i];
      sum += value;
      if (value > peak) peak = value;
    }

    const avg = sum / (endBin - startBin + 1) / 255.0;
    const peakNorm = peak / 255.0;

    return avg * ANALYSIS.WEIGHT.BAND + peakNorm * ANALYSIS.WEIGHT.PEAK;
  }

  /**
   * Extract bass energy combining frequency band and RMS
   * @param {Uint8Array} frequencyData
   * @param {Uint8Array} timeData
   * @param {number} freqPerBin
   * @param {number[]} range
   * @returns {number} Combined energy (0-1)
   */
  #extractBandEnergyWithRMS(frequencyData, timeData, freqPerBin, range) {
    const bandEnergy = this.#extractBandEnergy(frequencyData, freqPerBin, range);

    let rmsSum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const sample = (timeData[i] - 128) / 128.0;
      rmsSum += sample * sample;
    }
    const rms = Math.sqrt(rmsSum / timeData.length);

    return bandEnergy * ANALYSIS.WEIGHT.ENERGY + rms * ANALYSIS.WEIGHT.RMS;
  }

  /**
   * Exponential Moving Average
   * @param {number} prev
   * @param {number} current
   * @returns {number}
   */
  #ema(prev, current) {
    return this.#emaAlpha * current + (1 - this.#emaAlpha) * prev;
  }

  /**
   * Get current analysis values for the visualizer
   * @returns {Object}
   */
  getValues() {
    return {
      kick: Math.min(1, this.#kickValue),
      hihat: Math.min(1, this.#hihatValue),
      bass: Math.min(1, this.#bassValue),

      kickPeak: Math.min(1, this.#kickPeak),
      hihatPeak: Math.min(1, this.#hihatPeak),
      bassPeak: Math.min(1, this.#bassPeak),

      kickOnset: this.#kickFlux > this.#onsetThreshold,
      hihatOnset: this.#hihatFlux > this.#onsetThreshold,
      bassOnset: this.#bassFlux > this.#onsetThreshold,
    };
  }

  /**
   * Reset all analysis state
   */
  reset() {
    this.#initValues();
    this.#kickBuffer.reset();
    this.#hihatBuffer.reset();
    this.#bassBuffer.reset();
  }

  destroy() {
    this.reset();
  }
}
