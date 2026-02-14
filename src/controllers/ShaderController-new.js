/**
 * ShaderController factory function
 * Manages shader compilation and application, delegates to SoundRenderer/VisualRenderer
 */

import { EVENTS, UI } from '../utils/consts.js';
import { saveShader } from '../utils/storage.js';

/**
 * @param {Object} deps
 * @param {import('../gl/SoundRenderer.js').SoundRenderer} deps.soundRenderer
 * @param {import('../gl/VisualRenderer.js').VisualRenderer} deps.visualRenderer
 * @param {import('../editor/Editor-new.js').Editor} deps.editor
 * @param {import('../ui/StatusDisplay.js').StatusDisplay} deps.statusDisplay
 * @param {import('../state/EventBus.js').EventBus} deps.eventBus
 * @param {function(Error): void} deps.errorHandler
 */
export function createShaderController({
  soundRenderer,
  visualRenderer,
  editor,
  statusDisplay,
  eventBus,
  errorHandler,
}) {
  let statusTimer = null;

  /**
   * Initialize shaders with the code currently loaded in the editor
   * @param {string} soundCode
   * @param {string} visualCode
   */
  function initShaders(soundCode, visualCode) {
    soundRenderer.compile(soundCode);
    visualRenderer.compile(visualCode);
  }

  /**
   * Compile the current editor code
   */
  function compileShader() {
    try {
      const mode = editor.mode;
      const code = editor.getCurrentCode();

      eventBus.emit(EVENTS.SHADER_COMPILE_START, { mode });

      if (mode === UI.EDITOR_MODES.SOUND) {
        soundRenderer.compile(code);
        saveShader('sound', code);
        statusDisplay.showStatus('Sound Compiled & Saved', 'success');
      } else {
        visualRenderer.compile(code);
        saveShader('visual', code);
        statusDisplay.showStatus('Visual Compiled & Saved', 'success');
      }

      eventBus.emit(EVENTS.SHADER_COMPILE_SUCCESS, { mode });
      clearStatusAfter(3000);
    } catch (error) {
      eventBus.emit(EVENTS.SHADER_COMPILE_ERROR, { error });
      errorHandler(error);
    }
  }

  /**
   * Apply the previously compiled shader
   */
  function applyCompiledShader() {
    try {
      const mode = editor.mode;

      if (mode === UI.EDITOR_MODES.SOUND) {
        soundRenderer.applyCompiledShader();
        statusDisplay.showStatus('Sound Applied', 'success');
      } else {
        visualRenderer.applyCompiledShader();
        statusDisplay.showStatus('Visual Applied', 'success');
      }

      eventBus.emit(EVENTS.SHADER_APPLIED, { mode });
      clearStatusAfter(2000);
    } catch (error) {
      errorHandler(error);
    }
  }

  function clearStatusAfter(delay) {
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      statusDisplay.showStatus('Ready');
      statusTimer = null;
    }, delay);
  }

  function destroy() {
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
  }

  return {
    initShaders,
    compileShader,
    applyCompiledShader,
    destroy,
  };
}
