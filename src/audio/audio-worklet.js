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

      if (type === 'setCurrentBuffer') {
        this.currentBuffer = data;
        this.readPos = 0;
      } else if (type === 'setNextBuffer') {
        this.nextBuffer = data;
        this.nextBufferReady = true;
      } else if (type === 'setVolume') {
        this.volume = data;
      } else if (type === 'setReadPosition') {
        this.readPos = data;
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

      const leftSample = this.currentBuffer[this.readPos * 2] * this.volume;
      const rightSample = this.currentBuffer[this.readPos * 2 + 1] * this.volume;
      
      leftChannel[i] = leftSample;
      rightChannel[i] = rightSample;
      
      this.readPos++;
    }

    return true;
  }
}

registerProcessor('glsl-audio-processor', GLSLAudioProcessor);
