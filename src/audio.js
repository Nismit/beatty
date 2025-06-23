import { AUDIO } from './consts.js';
import { AudioAnalyzer } from './audio-analyzer.js';

export class Audio {
  constructor() {
    this.audioContext = null;
    this.audioWorkletNode = null;
    this.analyserNode = null;

    this.currentBuffer = null;
    this.nextBuffer = null;
    this.isGeneratingNext = false;

    this.timeDataArray = null;
    this.frequencyDataArray = null;

    this.audioAnalyzer = new AudioAnalyzer({
      kickFreqRange: [20, 80],
      hihatFreqRange: [5000, 12000],
      bassFreqRange: [100, 300],
      historyLength: 5,
      smoothingTimeConstant: 0.6
    });

    this.generateBufferCallback = null;
  }

  async init() {
    this.audioContext = new AudioContext();

    await this.audioContext.audioWorklet.addModule('./audio-worklet.js');

    this.audioWorkletNode = new AudioWorkletNode(
      this.audioContext,
      'glsl-audio-processor',
    );

    this.audioWorkletNode.port.onmessage = (event) => {
      if (event.data.type === 'requestNextBuffer') {
        this.generateNextBuffer();
      }
    };

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = AUDIO.FFT_SIZE;
    this.analyserNode.smoothingTimeConstant = AUDIO.SMOOTHING_TIME_CONSTANT;
    this.analyserNode.minDecibels = AUDIO.MIN_DECIBELS;
    this.analyserNode.maxDecibels = AUDIO.MAX_DECIBELS;

    this.frequencyDataArray = new Uint8Array(
      this.analyserNode.frequencyBinCount,
    );
    this.timeDataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
  }

  async start(volume) {
    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (this.generateBufferCallback) {
        this.currentBuffer = await this.generateBufferCallback(0);
        this.postMessageToWorklet('setCurrentBuffer', this.currentBuffer);
      }

      this.postMessageToWorklet('setVolume', volume);
      this.postMessageToWorklet('setReadPosition', 0);

      this.audioWorkletNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);

      if (this.generateBufferCallback) {
        this.generateNextBuffer();
      }
      
    } catch (error) {
      console.error('Audio start error:', error);
      throw error;
    }
  }

  async resume(volume, pausedReadPos = 0) {
    try {
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (this.currentBuffer && pausedReadPos < this.currentBuffer.length) {
        this.postMessageToWorklet('setReadPosition', pausedReadPos);
      }

      this.postMessageToWorklet('setVolume', volume);

      this.audioWorkletNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
      
    } catch (error) {
      console.error('Audio resume error:', error);
      throw error;
    }
  }

  pause() {
    try {
      this.audioWorkletNode.disconnect();
      this.analyserNode.disconnect();
    } catch (error) {
      console.error('Audio pause error:', error);
      throw error;
    }
  }

  stop() {
    try {
      this.audioWorkletNode.disconnect();
      this.analyserNode.disconnect();
      
      this.currentBuffer = null;
      this.nextBuffer = null;
    } catch (error) {
      console.error('Audio stop error:', error);
      throw error;
    }
  }

  setVolume(volume) {
    this.postMessageToWorklet('setVolume', volume);
  }

  async generateNextBuffer() {
    if (this.isGeneratingNext || !this.generateBufferCallback) return;
    
    this.isGeneratingNext = true;

    try {
      this.nextBuffer = await this.generateBufferCallback();
      this.postMessageToWorklet('setNextBuffer', this.nextBuffer);
      
    } catch (error) {
      console.error('Buffer generation error:', error);
    } finally {
      this.isGeneratingNext = false;
    }
  }

  postMessageToWorklet(type, data) {
    if (!this.audioWorkletNode || !this.audioWorkletNode.port) {
      console.warn('Audio Worklet Node is not initialized or port is not available.');
      return;
    }

    this.audioWorkletNode.port.postMessage({ type, data });
  }

  analyzeAudioData() {
    if (!this.frequencyDataArray || !this.timeDataArray) return;

    this.analyserNode.getByteTimeDomainData(this.timeDataArray);
    this.analyserNode.getByteFrequencyData(this.frequencyDataArray);

    this.audioAnalyzer.analyzeAudioData(
      this.frequencyDataArray,
      this.timeDataArray,
      this.audioContext.sampleRate
    );
  }
}