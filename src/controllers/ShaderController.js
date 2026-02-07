import { saveShader } from '../utils/storage.js';

/**
 * ShaderController - シェーダーのコンパイルと適用
 */
export class ShaderController {
  constructor(soundGL, visualGL, editor, statusManager, appState, uiController) {
    this.soundGL = soundGL;
    this.visualGL = visualGL;
    this.editor = editor;
    this.statusManager = statusManager;
    this.appState = appState;
    this.uiController = uiController;
  }

  /**
   * デフォルトシェーダーを初期化
   */
  initDefaultShaders() {
    const soundCode = this.editor.currentSoundCode;
    const visualCode = this.editor.currentVisualCode;

    this.soundGL.compile(soundCode);
    this.visualGL.compile(visualCode);
  }

  /**
   * 現在のエディタコードをコンパイル
   */
  compileShader() {
    try {
      const currentMode = this.editor.editMode;
      const code = this.editor.getCurrentEditCode();

      if (currentMode === 'sound') {
        this.soundGL.compile(code);
        saveShader('sound', code);
        this.statusManager.updateStatusLine('Sound Compiled & Saved - Apply with ⌘R', 'success');
      } else {
        this.visualGL.compile(code);
        saveShader('visual', code);
        this.statusManager.updateStatusLine('Visual Compiled & Saved - Apply with ⌘R', 'success');
      }

      this.uiController.clearStatusMessageAfter(3000);
    } catch (error) {
      this.statusManager.updateStatusLine(`ERR: ${error.message}`, 'error');
    }
  }

  /**
   * コンパイル済みシェーダーを適用
   */
  applyCompiledShader() {
    try {
      if (this.editor.editMode === 'sound') {
        this.soundGL.applyCompiledShader();
        this.appState.pendingApply = true;
        this.statusManager.updateStatusLine('Sound Applied - Will take effect in next bar', 'success');
      } else {
        this.visualGL.applyCompiledShader();
        this.statusManager.updateStatusLine('Visual Applied - Immediate effect', 'success');
      }

      this.uiController.clearStatusMessageAfter(2000);
    } catch (error) {
      this.statusManager.updateStatusLine(`ERR: ${error.message}`, 'error');
    }
  }
}
