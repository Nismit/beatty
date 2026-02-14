import { beforeEach, vi } from 'vitest';

// WebGL2 mock
class WebGL2RenderingContextMock {
  createShader() {
    return {};
  }
  shaderSource() {}
  compileShader() {}
  getShaderParameter() {
    return true;
  }
  getShaderInfoLog() {
    return '';
  }
  createProgram() {
    return {};
  }
  attachShader() {}
  linkProgram() {}
  getProgramParameter() {
    return true;
  }
  getProgramInfoLog() {
    return '';
  }
  useProgram() {}
  deleteShader() {}
  deleteProgram() {}
  getUniformLocation() {
    return {};
  }
  getAttribLocation() {
    return 0;
  }
  uniform1f() {}
  uniform2f() {}
  uniform3f() {}
  uniform4f() {}
  uniform1i() {}
  createBuffer() {
    return {};
  }
  bindBuffer() {}
  bufferData() {}
  deleteBuffer() {}
  enableVertexAttribArray() {}
  vertexAttribPointer() {}
  drawArrays() {}
  createTransformFeedback() {
    return {};
  }
  bindTransformFeedback() {}
  transformFeedbackVaryings() {}
  beginTransformFeedback() {}
  endTransformFeedback() {}
  getBufferSubData() {}
  viewport() {}
  clearColor() {}
  clear() {}
  enable() {}
  disable() {}
  blendFunc() {}
}

// Canvas mock
HTMLCanvasElement.prototype.getContext = (type) => {
  if (type === 'webgl2') {
    return new WebGL2RenderingContextMock();
  }
  return null;
};

// AudioContext mock
global.AudioContext = vi.fn().mockImplementation(() => ({
  createAnalyser: vi.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 },
  })),
  createBufferSource: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    buffer: null,
  })),
  createBuffer: vi.fn(() => ({
    getChannelData: vi.fn(() => new Float32Array(1024)),
  })),
  destination: {},
  sampleRate: 48000,
  currentTime: 0,
  state: 'running',
  resume: vi.fn().mockResolvedValue(),
  suspend: vi.fn().mockResolvedValue(),
  close: vi.fn().mockResolvedValue(),
  audioWorklet: {
    addModule: vi.fn().mockResolvedValue(),
  },
}));

// AudioWorkletNode mock
global.AudioWorkletNode = vi.fn().mockImplementation(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  port: {
    postMessage: vi.fn(),
    onmessage: null,
  },
}));

// localStorage mock (jsdom provides this, but ensure it's clean)
beforeEach(() => {
  localStorage.clear();
});
