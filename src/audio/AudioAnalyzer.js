/**
 * Audio Analysis Module
 * Handles frequency analysis, audio feature extraction, and smoothing for audio visualization
 * Features: Ring buffer smoothing, EMA, peak detection, spectral flux, adaptive normalization
 */

/**
 * Ring Buffer for O(1) smoothing operations
 */
class RingBuffer {
  constructor(size) {
    this.size = size;
    this.buffer = new Float32Array(size);
    this.index = 0;
    this.filled = 0;
    this.sum = 0;
  }

  push(value) {
    // Subtract old value from sum
    this.sum -= this.buffer[this.index];
    // Add new value
    this.buffer[this.index] = value;
    this.sum += value;
    // Advance index
    this.index = (this.index + 1) % this.size;
    if (this.filled < this.size) this.filled++;
  }

  average() {
    return this.filled > 0 ? this.sum / this.filled : 0;
  }

  reset() {
    this.buffer.fill(0);
    this.index = 0;
    this.filled = 0;
    this.sum = 0;
  }
}

export class AudioAnalyzer {
  constructor(options = {}) {
    // Analysis parameters
    this.kickFreqRange = options.kickFreqRange || [20, 80];
    this.hihatFreqRange = options.hihatFreqRange || [5000, 12000];
    this.bassFreqRange = options.bassFreqRange || [100, 300];

    // Smoothing configuration
    this.historyLength = options.historyLength || 8;
    this.emaAlpha = options.emaAlpha || 0.3; // Higher = more responsive

    // Peak detection config
    this.peakDecay = options.peakDecay || 0.95;
    this.onsetThreshold = options.onsetThreshold || 0.15;

    // Initialize analysis state
    this.initializeState();
  }

  /**
   * Initialize or reset all analysis state
   */
  initializeState() {
    // Current raw values
    this.kickRaw = 0;
    this.hihatRaw = 0;
    this.bassRaw = 0;

    // EMA smoothed values (main output)
    this.kickValue = 0;
    this.hihatValue = 0;
    this.bassValue = 0;

    // Peak values with decay
    this.kickPeak = 0;
    this.hihatPeak = 0;
    this.bassPeak = 0;

    // Spectral flux (onset detection)
    this.kickFlux = 0;
    this.hihatFlux = 0;
    this.bassFlux = 0;

    // Previous frame values for flux calculation
    this.prevKick = 0;
    this.prevHihat = 0;
    this.prevBass = 0;

    // Ring buffers for moving average
    this.kickBuffer = new RingBuffer(this.historyLength);
    this.hihatBuffer = new RingBuffer(this.historyLength);
    this.bassBuffer = new RingBuffer(this.historyLength);

    // Adaptive normalization state
    this.kickMax = 0.001;
    this.hihatMax = 0.001;
    this.bassMax = 0.001;
    this.normDecay = 0.999; // Slow decay for max tracking

    // Previous frequency data for spectral flux
    this.prevFrequencyData = null;
  }

  /**
   * Analyze audio data from frequency and time domain arrays
   * @param {Uint8Array} frequencyDataArray - Frequency domain data from analyser
   * @param {Uint8Array} timeDataArray - Time domain data from analyser
   * @param {number} sampleRate - Audio context sample rate
   */
  analyzeAudioData(frequencyDataArray, timeDataArray, sampleRate) {
    if (!frequencyDataArray || !timeDataArray) return;

    const binCount = frequencyDataArray.length;
    const freqPerBin = sampleRate / (2 * binCount);

    // Extract raw features
    this.kickRaw = this.extractBandEnergy(frequencyDataArray, freqPerBin, this.kickFreqRange);
    this.hihatRaw = this.extractBandEnergy(frequencyDataArray, freqPerBin, this.hihatFreqRange);
    this.bassRaw = this.extractBandEnergyWithRMS(frequencyDataArray, timeDataArray, freqPerBin, this.bassFreqRange);

    // Calculate spectral flux (onset detection)
    this.calculateSpectralFlux();

    // Update adaptive normalization
    this.updateNormalization();

    // Apply normalized values to ring buffers
    const normalizedKick = this.kickRaw / this.kickMax;
    const normalizedHihat = this.hihatRaw / this.hihatMax;
    const normalizedBass = this.bassRaw / this.bassMax;

    this.kickBuffer.push(normalizedKick);
    this.hihatBuffer.push(normalizedHihat);
    this.bassBuffer.push(normalizedBass);

    // Apply EMA smoothing on buffer averages
    const kickAvg = this.kickBuffer.average();
    const hihatAvg = this.hihatBuffer.average();
    const bassAvg = this.bassBuffer.average();

    this.kickValue = this.ema(this.kickValue, kickAvg, this.emaAlpha);
    this.hihatValue = this.ema(this.hihatValue, hihatAvg, this.emaAlpha);
    this.bassValue = this.ema(this.bassValue, bassAvg, this.emaAlpha);

    // Update peak values with decay
    this.updatePeaks();

    // Store for next frame flux calculation
    this.prevKick = this.kickRaw;
    this.prevHihat = this.hihatRaw;
    this.prevBass = this.bassRaw;
  }

  /**
   * Extract energy from a frequency band
   * @param {Uint8Array} frequencyDataArray - Frequency data
   * @param {number} freqPerBin - Frequency per bin
   * @param {number[]} range - [startFreq, endFreq]
   * @returns {number} Band energy (0-1)
   */
  extractBandEnergy(frequencyDataArray, freqPerBin, range) {
    const [startFreq, endFreq] = range;
    const startBin = Math.max(0, Math.floor(startFreq / freqPerBin));
    const endBin = Math.min(frequencyDataArray.length - 1, Math.floor(endFreq / freqPerBin));

    if (endBin <= startBin) return 0;

    let sum = 0;
    let peak = 0;
    for (let i = startBin; i <= endBin; i++) {
      const value = frequencyDataArray[i];
      sum += value;
      if (value > peak) peak = value;
    }

    // Combine average and peak for better transient response
    const avg = sum / (endBin - startBin + 1) / 255.0;
    const peakNorm = peak / 255.0;

    return avg * 0.6 + peakNorm * 0.4;
  }

  /**
   * Extract bass energy combining frequency and RMS
   * @param {Uint8Array} frequencyDataArray - Frequency data
   * @param {Uint8Array} timeDataArray - Time domain data
   * @param {number} freqPerBin - Frequency per bin
   * @param {number[]} range - [startFreq, endFreq]
   * @returns {number} Combined bass energy (0-1)
   */
  extractBandEnergyWithRMS(frequencyDataArray, timeDataArray, freqPerBin, range) {
    const bandEnergy = this.extractBandEnergy(frequencyDataArray, freqPerBin, range);

    // RMS calculation
    let rmsSum = 0;
    for (let i = 0; i < timeDataArray.length; i++) {
      const sample = (timeDataArray[i] - 128) / 128.0;
      rmsSum += sample * sample;
    }
    const rms = Math.sqrt(rmsSum / timeDataArray.length);

    return bandEnergy * 0.7 + rms * 0.3;
  }

  /**
   * Calculate spectral flux for onset detection
   */
  calculateSpectralFlux() {
    // Positive difference only (onset = energy increase)
    this.kickFlux = Math.max(0, this.kickRaw - this.prevKick);
    this.hihatFlux = Math.max(0, this.hihatRaw - this.prevHihat);
    this.bassFlux = Math.max(0, this.bassRaw - this.prevBass);
  }

  /**
   * Update adaptive normalization
   */
  updateNormalization() {
    // Decay existing max values
    this.kickMax *= this.normDecay;
    this.hihatMax *= this.normDecay;
    this.bassMax *= this.normDecay;

    // Update max if current value is higher
    if (this.kickRaw > this.kickMax) this.kickMax = this.kickRaw;
    if (this.hihatRaw > this.hihatMax) this.hihatMax = this.hihatRaw;
    if (this.bassRaw > this.bassMax) this.bassMax = this.bassRaw;

    // Ensure minimum to avoid division issues
    this.kickMax = Math.max(this.kickMax, 0.001);
    this.hihatMax = Math.max(this.hihatMax, 0.001);
    this.bassMax = Math.max(this.bassMax, 0.001);
  }

  /**
   * Update peak values with decay
   */
  updatePeaks() {
    // Decay peaks
    this.kickPeak *= this.peakDecay;
    this.hihatPeak *= this.peakDecay;
    this.bassPeak *= this.peakDecay;

    // Update if current value exceeds decayed peak
    if (this.kickValue > this.kickPeak) this.kickPeak = this.kickValue;
    if (this.hihatValue > this.hihatPeak) this.hihatPeak = this.hihatValue;
    if (this.bassValue > this.bassPeak) this.bassPeak = this.bassValue;
  }

  /**
   * Exponential Moving Average
   * @param {number} prev - Previous EMA value
   * @param {number} current - Current value
   * @param {number} alpha - Smoothing factor (0-1)
   * @returns {number} New EMA value
   */
  ema(prev, current, alpha) {
    return alpha * current + (1 - alpha) * prev;
  }

  /**
   * Check if onset detected for a band
   * @param {string} band - 'kick', 'hihat', or 'bass'
   * @returns {boolean} True if onset detected
   */
  isOnset(band) {
    switch (band) {
      case 'kick': return this.kickFlux > this.onsetThreshold;
      case 'hihat': return this.hihatFlux > this.onsetThreshold;
      case 'bass': return this.bassFlux > this.onsetThreshold;
      default: return false;
    }
  }

  /**
   * Get current analysis values (main output for visualizer)
   * @returns {Object} Current kick, hihat, and bass values
   */
  getAnalysisValues() {
    return {
      // Main smoothed values (0-1, normalized)
      kick: Math.min(1, this.kickValue),
      hihat: Math.min(1, this.hihatValue),
      bass: Math.min(1, this.bassValue),

      // Peak values (for flash effects)
      kickPeak: Math.min(1, this.kickPeak),
      hihatPeak: Math.min(1, this.hihatPeak),
      bassPeak: Math.min(1, this.bassPeak),

      // Onset/flux values (for beat sync)
      kickFlux: this.kickFlux,
      hihatFlux: this.hihatFlux,
      bassFlux: this.bassFlux,

      // Onset detection flags
      kickOnset: this.isOnset('kick'),
      hihatOnset: this.isOnset('hihat'),
      bassOnset: this.isOnset('bass'),
    };
  }

  /**
   * Reset analysis state
   */
  reset() {
    this.initializeState();
  }

  /**
   * Update frequency ranges for different instruments
   * @param {Object} ranges - Object containing frequency ranges
   */
  updateFrequencyRanges(ranges) {
    if (ranges.kickFreqRange) this.kickFreqRange = ranges.kickFreqRange;
    if (ranges.hihatFreqRange) this.hihatFreqRange = ranges.hihatFreqRange;
    if (ranges.bassFreqRange) this.bassFreqRange = ranges.bassFreqRange;
  }

  /**
   * Update analysis parameters
   * @param {Object} config - Configuration object
   */
  updateConfig(config) {
    if (config.historyLength && config.historyLength !== this.historyLength) {
      this.historyLength = config.historyLength;
      this.kickBuffer = new RingBuffer(this.historyLength);
      this.hihatBuffer = new RingBuffer(this.historyLength);
      this.bassBuffer = new RingBuffer(this.historyLength);
    }
    if (config.emaAlpha !== undefined) this.emaAlpha = config.emaAlpha;
    if (config.peakDecay !== undefined) this.peakDecay = config.peakDecay;
    if (config.onsetThreshold !== undefined) this.onsetThreshold = config.onsetThreshold;
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfiguration() {
    return {
      kickFreqRange: this.kickFreqRange,
      hihatFreqRange: this.hihatFreqRange,
      bassFreqRange: this.bassFreqRange,
      historyLength: this.historyLength,
      emaAlpha: this.emaAlpha,
      peakDecay: this.peakDecay,
      onsetThreshold: this.onsetThreshold,
    };
  }
}
