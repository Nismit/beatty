import { 
  createProgram, 
  createFullscreenQuad,
  setUniform,
  deleteResource,
  buildVisualShader,
  getFullscreenVertexShader
} from './utils.js';

export class VisualGL {
  constructor() {
    this.visualizerCanvas = null;
    this.gl = null;
    this.program = null;
    this.compiledProgram = null;
    this.vao = null;
    this.vbo = null;
  }

  init() {
    // キャンバス初期化
    this.visualizerCanvas = document.getElementById('visualizerCanvas');
    if (!this.visualizerCanvas) {
      throw new Error('Visualizer canvas not found');
    }

    this.gl = this.visualizerCanvas.getContext('webgl2');
    if (!this.gl) {
      throw new Error('WebGL2 not supported');
    }

    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.visualizerCanvas || !this.gl) return;
    
    this.visualizerCanvas.width = window.innerWidth;
    this.visualizerCanvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.visualizerCanvas.width, this.visualizerCanvas.height);
  }

  compile(visualCode) {
    const gl = this.gl;
    const vertexSource = getFullscreenVertexShader();
    const fragmentSource = buildVisualShader(visualCode);

    const program = createProgram(gl, vertexSource, fragmentSource);

    if (this.compiledProgram && this.compiledProgram !== this.program) {
      deleteResource(gl, 'program', this.compiledProgram);
    }

    this.compiledProgram = program;

    if (!this.program) {
      this.program = this.compiledProgram;
    }

    if (!this.vao) {
      const quad = createFullscreenQuad(gl, program);
      this.vao = quad.vao;
      this.vbo = quad.vbo;
    }
  }

  render(audioAnalysisData, appState) {
    if (!this.gl || !this.program || !this.vao) return;

    const gl = this.gl;
    
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    const currentTime = appState.getCurrentTime();

    // Set uniforms
    setUniform(gl, this.program, 'u_resolution', '2f', 
      this.visualizerCanvas.width, this.visualizerCanvas.height);
    setUniform(gl, this.program, 'u_time', '1f', currentTime);
    
    if (audioAnalysisData) {
      // Main smoothed values
      setUniform(gl, this.program, 'u_kick', '1f', audioAnalysisData.kick || 0);
      setUniform(gl, this.program, 'u_hihat', '1f', audioAnalysisData.hihat || 0);
      setUniform(gl, this.program, 'u_bass', '1f', audioAnalysisData.bass || 0);

      // Peak values (for flash effects)
      setUniform(gl, this.program, 'u_kickPeak', '1f', audioAnalysisData.kickPeak || 0);
      setUniform(gl, this.program, 'u_hihatPeak', '1f', audioAnalysisData.hihatPeak || 0);
      setUniform(gl, this.program, 'u_bassPeak', '1f', audioAnalysisData.bassPeak || 0);

      // Onset detection (1.0 if onset, 0.0 otherwise)
      setUniform(gl, this.program, 'u_kickOnset', '1f', audioAnalysisData.kickOnset ? 1.0 : 0.0);
      setUniform(gl, this.program, 'u_hihatOnset', '1f', audioAnalysisData.hihatOnset ? 1.0 : 0.0);
      setUniform(gl, this.program, 'u_bassOnset', '1f', audioAnalysisData.bassOnset ? 1.0 : 0.0);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  applyCompiledShader() {
    if (this.compiledProgram) {
      const oldProgram = this.program;
      this.program = this.compiledProgram;
      
      if (oldProgram && oldProgram !== this.compiledProgram) {
        deleteResource(this.gl, 'program', oldProgram);
      }
    }
  }
}