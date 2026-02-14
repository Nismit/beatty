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
    this.readPos = 0;
    this.volume = 0.3;

    this.port.onmessage = (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'setCurrentBuffer':
          this.currentBuffer = data;
          this.readPos = 0;
          break;
        case 'setNextBuffer':
          this.nextBuffer = data;
          this.nextBufferReady = true;
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

    for (let i = 0; i < leftChannel.length; i++) {
      if (this.readPos * 2 + 1 >= this.currentBuffer.length) {
        if (this.nextBufferReady) {
          this.currentBuffer = this.nextBuffer;
          this.nextBuffer = null;
          this.nextBufferReady = false;
          this.readPos = 0;
          this.port.postMessage({ type: 'requestNextBuffer' });
        } else {
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
