/**
 * AudioWorkletProcessor for GLSL-generated audio playback
 * Handles double-buffering of audio data from the main thread
 */
class GLSLAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.currentBuffer = null;
    this.nextBuffer = null;
    this.nextBufferReady = false;
    this.nextBufferRequested = false;
    this.readPos = 0;
    this.volume = 0.3;
    this.underrunCount = 0;

    this.port.onmessage = (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'setCurrentBuffer':
          this.currentBuffer = data;
          this.readPos = 0;
          this.nextBufferRequested = false;
          this.underrunCount = 0;
          break;
        case 'setNextBuffer':
          this.nextBuffer = data;
          this.nextBufferReady = true;
          this.nextBufferRequested = false;
          break;
        case 'setVolume':
          this.volume = data;
          break;
        case 'setReadPosition':
          this.readPos = data;
          break;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const leftChannel = output[0];
    const rightChannel = output[1] || output[0];

    if (!this.currentBuffer) {
      for (let i = 0; i < leftChannel.length; i++) {
        leftChannel[i] = 0.0;
        rightChannel[i] = 0.0;
      }
      return true;
    }

    // Calculate samples count (stereo: buffer.length / 2)
    const totalSamples = this.currentBuffer.length / 2;
    const prefetchPoint = totalSamples * 0.25;

    for (let i = 0; i < leftChannel.length; i++) {
      // Request next buffer at 25% point (early prefetch)
      if (
        !this.nextBufferReady &&
        !this.nextBufferRequested &&
        this.readPos > prefetchPoint
      ) {
        this.nextBufferRequested = true;
        this.port.postMessage({ type: 'requestNextBuffer' });
      }

      // Check if we need to swap buffers
      if (this.readPos >= totalSamples) {
        if (this.nextBufferReady) {
          this.currentBuffer = this.nextBuffer;
          this.nextBuffer = null;
          this.nextBufferReady = false;
          this.nextBufferRequested = false;
          this.readPos = 0;
        } else {
          // Buffer underrun - next buffer not ready
          this.underrunCount++;
          if (this.underrunCount === 1 || this.underrunCount % 1000 === 0) {
            this.port.postMessage({
              type: 'bufferUnderrun',
              count: this.underrunCount,
            });
          }
          leftChannel[i] = 0.0;
          rightChannel[i] = 0.0;
          continue;
        }
      }

      leftChannel[i] = this.currentBuffer[this.readPos * 2] * this.volume;
      rightChannel[i] = this.currentBuffer[this.readPos * 2 + 1] * this.volume;
      this.readPos++;
    }

    return true;
  }
}

registerProcessor('glsl-audio-processor', GLSLAudioProcessor);
