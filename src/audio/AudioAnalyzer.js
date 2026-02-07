/**
 * Audio Analysis Module
 * Handles frequency analysis, audio feature extraction, and smoothing for audio visualization
 * Extracted from main AudioVisualizerSystem to improve code organization
 */

export class AudioAnalyzer {
  constructor(options = {}) {
    // Analysis parameters
    this.kickFreqRange = options.kickFreqRange || [20, 80];
    this.hihatFreqRange = options.hihatFreqRange || [5000, 12000];
    this.bassFreqRange = options.bassFreqRange || [100, 300];
    
    // Smoothing configuration
    this.historyLength = options.historyLength || 5;
    this.smoothingTimeConstant = options.smoothingTimeConstant || 0.6;
    
    // Analysis values
    this.kickValue = 0;
    this.hihatValue = 0;
    this.bassValue = 0;
    
    // History arrays for smoothing
    this.kickHistory = [];
    this.hihatHistory = [];
    this.bassHistory = [];
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

    // Extract audio features
    this.kickValue = this.extractKickFeature(frequencyDataArray, freqPerBin);
    this.hihatValue = this.extractHihatFeature(frequencyDataArray, freqPerBin);
    this.bassValue = this.extractBassFeature(frequencyDataArray, timeDataArray, freqPerBin);

    // Apply smoothing
    this.applySmoothing();
  }

  /**
   * Extract kick drum feature from low frequency range
   * @param {Uint8Array} frequencyDataArray - Frequency data
   * @param {number} freqPerBin - Frequency per bin
   * @returns {number} Normalized kick value (0-1)
   */
  extractKickFeature(frequencyDataArray, freqPerBin) {
    const [startFreq, endFreq] = this.kickFreqRange;
    const startBin = Math.floor(startFreq / freqPerBin);
    const endBin = Math.floor(endFreq / freqPerBin);
    
    let sum = 0;
    for (let i = startBin; i <= endBin; i++) {
      sum += frequencyDataArray[i];
    }
    
    return sum / (endBin - startBin + 1) / 255.0;
  }

  /**
   * Extract hihat feature from high frequency range
   * @param {Uint8Array} frequencyDataArray - Frequency data
   * @param {number} freqPerBin - Frequency per bin
   * @returns {number} Normalized hihat value (0-1)
   */
  extractHihatFeature(frequencyDataArray, freqPerBin) {
    const [startFreq, endFreq] = this.hihatFreqRange;
    const startBin = Math.floor(startFreq / freqPerBin);
    const endBin = Math.floor(endFreq / freqPerBin);
    
    let sum = 0;
    for (let i = startBin; i <= endBin; i++) {
      sum += frequencyDataArray[i];
    }
    
    return sum / (endBin - startBin + 1) / 255.0;
  }

  /**
   * Extract bass feature combining frequency analysis and RMS
   * @param {Uint8Array} frequencyDataArray - Frequency data
   * @param {Uint8Array} timeDataArray - Time domain data
   * @param {number} freqPerBin - Frequency per bin
   * @returns {number} Normalized bass value (0-1)
   */
  extractBassFeature(frequencyDataArray, timeDataArray, freqPerBin) {
    // Frequency-based bass detection
    const [startFreq, endFreq] = this.bassFreqRange;
    const startBin = Math.floor(startFreq / freqPerBin);
    const endBin = Math.floor(endFreq / freqPerBin);
    
    let bassSum = 0;
    for (let i = startBin; i <= endBin; i++) {
      bassSum += frequencyDataArray[i];
    }
    const bassAvg = bassSum / (endBin - startBin + 1) / 255.0;

    // RMS calculation for overall energy
    let rmsSum = 0;
    for (let i = 0; i < timeDataArray.length; i++) {
      const sample = (timeDataArray[i] - 128) / 128.0;
      rmsSum += sample * sample;
    }
    const rms = Math.sqrt(rmsSum / timeDataArray.length);

    // Combine frequency and energy information
    return (bassAvg + rms) * 0.5;
  }

  /**
   * Apply smoothing to all audio features using history averaging
   */
  applySmoothing() {
    // Kick smoothing
    this.kickHistory.push(this.kickValue);
    if (this.kickHistory.length > this.historyLength) {
      this.kickHistory.shift();
    }
    this.kickValue = this.kickHistory.reduce((a, b) => a + b, 0) / this.kickHistory.length;

    // Hihat smoothing
    this.hihatHistory.push(this.hihatValue);
    if (this.hihatHistory.length > this.historyLength) {
      this.hihatHistory.shift();
    }
    this.hihatValue = this.hihatHistory.reduce((a, b) => a + b, 0) / this.hihatHistory.length;

    // Bass smoothing
    this.bassHistory.push(this.bassValue);
    if (this.bassHistory.length > this.historyLength) {
      this.bassHistory.shift();
    }
    this.bassValue = this.bassHistory.reduce((a, b) => a + b, 0) / this.bassHistory.length;
  }

  /**
   * Get current analysis values
   * @returns {Object} Current kick, hihat, and bass values
   */
  getAnalysisValues() {
    return {
      kick: this.kickValue,
      hihat: this.hihatValue,
      bass: this.bassValue
    };
  }

  /**
   * Reset analysis state
   */
  reset() {
    this.kickValue = 0;
    this.hihatValue = 0;
    this.bassValue = 0;
    this.kickHistory = [];
    this.hihatHistory = [];
    this.bassHistory = [];
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
   * Update smoothing parameters
   * @param {Object} smoothingConfig - Smoothing configuration
   */
  updateSmoothingConfig(smoothingConfig) {
    if (smoothingConfig.historyLength) {
      this.historyLength = smoothingConfig.historyLength;
      // Trim history arrays if needed
      this.kickHistory = this.kickHistory.slice(-this.historyLength);
      this.hihatHistory = this.hihatHistory.slice(-this.historyLength);
      this.bassHistory = this.bassHistory.slice(-this.historyLength);
    }
    if (smoothingConfig.smoothingTimeConstant) {
      this.smoothingTimeConstant = smoothingConfig.smoothingTimeConstant;
    }
  }

  /**
   * Get frequency analysis configuration
   * @returns {Object} Current frequency ranges and smoothing config
   */
  getConfiguration() {
    return {
      kickFreqRange: this.kickFreqRange,
      hihatFreqRange: this.hihatFreqRange,
      bassFreqRange: this.bassFreqRange,
      historyLength: this.historyLength,
      smoothingTimeConstant: this.smoothingTimeConstant
    };
  }
}
