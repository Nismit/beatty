/**
 * Lookahead Limiter AudioWorkletProcessor
 * Prevents clipping by looking ahead and smoothly reducing gain
 *
 * Ref: https://www.musicdsp.org/en/latest/Effects/274-lookahead-limiter.html
 */

const BLOCK_SIZE = 128;
const LOOKAHEAD_BLOCKS = 2; // 256 samples at 128 block size

class LookaheadLimiterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    /** Release time in seconds */
    this.release = 0.1;

    /** Head index for circular buffer */
    this._head = 0;

    /** Current gain reduction factor */
    this._factor = 0.0;

    /** Input buffers for each channel (circular, 2x block size for lookahead) */
    this._buffersInput = [
      new Float32Array(BLOCK_SIZE * LOOKAHEAD_BLOCKS),
      new Float32Array(BLOCK_SIZE * LOOKAHEAD_BLOCKS),
    ];

    /** Buffer for absolute values (peak detection) */
    this._bufferAbs = new Float32Array(BLOCK_SIZE * LOOKAHEAD_BLOCKS);

    /** Moving average buffer (1st stage) */
    this._bufferMA1 = new Float32Array(BLOCK_SIZE);
    this._sumMA1 = 0.0;

    /** Moving average buffer (2nd stage) */
    this._bufferMA2 = new Float32Array(BLOCK_SIZE);
    this._sumMA2 = 0.0;

    /** Peak hold values */
    this._peak = 0.0;
    this._iPeak = 0;
  }

  process(inputs, outputs) {
    const inputChannels = inputs?.[0];
    const outputChannels = outputs?.[0];

    if (!inputChannels?.length || !outputChannels?.length) {
      return true;
    }

    const leftIn = inputChannels[0];
    const rightIn = inputChannels[1] || inputChannels[0];
    const leftOut = outputChannels[0];
    const rightOut = outputChannels[1] || outputChannels[0];

    const bufferSize = BLOCK_SIZE * LOOKAHEAD_BLOCKS;

    for (let i = 0; i < BLOCK_SIZE; i++) {
      const headIdx = this._head + i;

      // Update peak level (max of both channels)
      this._bufferAbs[headIdx] = Math.max(Math.abs(leftIn[i]), Math.abs(rightIn[i]));

      // Peak hold - find new peak if current peak index expires
      if (this._iPeak === headIdx) {
        this._peak = 0.0;
        for (let j = 0; j < bufferSize; j++) {
          if (this._bufferAbs[j] > this._peak) {
            this._peak = this._bufferAbs[j];
            this._iPeak = j;
          }
        }
      }

      // Update peak if new sample is higher
      if (this._bufferAbs[headIdx] > this._peak) {
        this._peak = this._bufferAbs[headIdx];
        this._iPeak = headIdx;
      }

      // Calculate gain reduction factor
      let factor = Math.min(1.0 / this._peak, 1.0);
      factor = 1.0 - factor; // Invert for numerical stability on small values

      // Two-stage moving average for smooth attack
      this._sumMA1 += factor - this._bufferMA1[i];
      this._bufferMA1[i] = factor;
      factor = this._sumMA1 / BLOCK_SIZE;

      this._sumMA2 += factor - this._bufferMA2[i];
      this._bufferMA2[i] = factor;
      factor = this._sumMA2 / BLOCK_SIZE;

      // Apply release envelope
      const releaseCoeff = Math.exp(-1.0 / (sampleRate * this.release));
      this._factor = Math.max(factor, this._factor * releaseCoeff);

      // Convert back to gain multiplier
      const gain = 1.0 - this._factor;

      // Output delayed signal with gain reduction
      leftOut[i] = this._buffersInput[0][headIdx] * gain;
      rightOut[i] = this._buffersInput[1][headIdx] * gain;

      // Store new input samples in circular buffer
      this._buffersInput[0][headIdx] = leftIn[i];
      this._buffersInput[1][headIdx] = rightIn[i];
    }

    // Advance head position in circular buffer
    this._head = (this._head + BLOCK_SIZE) % bufferSize;

    return true;
  }
}

registerProcessor('lookahead-limiter-processor', LookaheadLimiterProcessor);
