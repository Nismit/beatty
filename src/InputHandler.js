/**
 * InputHandler - キーボードとモバイル入力の処理
 */
export class InputHandler {
  constructor(playbackController, shaderController, uiController, editor, appState) {
    this.playbackController = playbackController;
    this.shaderController = shaderController;
    this.uiController = uiController;
    this.editor = editor;
    this.appState = appState;
  }

  /**
   * 全イベントリスナーをセットアップ
   */
  setupEventListeners() {
    this.setupKeyboardHandlers();
    this.setupClickHandlers();
    this.setupMobileControls();
  }

  /**
   * キーボードショートカットをセットアップ
   */
  setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.uiController.hideHelpModal();
        return;
      }

      if ((e.ctrlKey || e.metaKey)) {
        switch (e.key) {
          case 'p':
            e.preventDefault();
            this.playbackController.togglePlayback();
            break;
          case 's':
            e.preventDefault();
            this.shaderController.compileShader();
            break;
          case 'r':
            e.preventDefault();
            this.shaderController.applyCompiledShader();
            break;
          case 't':
            e.preventDefault();
            this.editor.toggleEditor();
            break;
          case 'e':
            e.preventDefault();
            this.editor.switchEditMode();
            break;
          case 'i':
            e.preventDefault();
            this.playbackController.resetPlayback();
            break;
        }
      }
    });
  }

  /**
   * クリックハンドラをセットアップ
   */
  setupClickHandlers() {
    document.getElementById('bpmStatus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.uiController.showSliderPopup('bpm', e);
    });

    document.getElementById('volumeStatus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.uiController.showSliderPopup('volume', e);
    });

    document.getElementById('helpStatus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.uiController.showHelpModal();
    });

    document.getElementById('bpmSlider')?.addEventListener('input', (e) => {
      const bpm = parseInt(e.target.value);
      this.appState.setBpm(bpm);
    });

    document.getElementById('volumeSlider')?.addEventListener('input', (e) => {
      const volume = parseFloat(e.target.value);
      this.appState.setVolume(volume);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.slider-popup') && !e.target.closest('.status-clickable')) {
        this.uiController.hideAllSliderPopups();
      }
      if (!e.target.closest('.modal-content') && !e.target.closest('#helpStatus') && !e.target.closest('#mobileHelp')) {
        this.uiController.hideHelpModal();
      }
    });
  }

  /**
   * モバイルコントロールをセットアップ
   */
  setupMobileControls() {
    const playToggleBtn = document.getElementById('mobilePlayToggle');
    const resetBtn = document.getElementById('mobileReset');
    const compileBtn = document.getElementById('mobileCompile');
    const applyBtn = document.getElementById('mobileApply');
    const toggleEditorBtn = document.getElementById('mobileToggleEditor');
    const toggleModeBtn = document.getElementById('mobileToggleMode');
    const helpBtn = document.getElementById('mobileHelp');

    if (playToggleBtn) {
      playToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.playbackController.togglePlayback();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.playbackController.resetPlayback();
      });
    }

    if (compileBtn) {
      compileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.shaderController.compileShader();
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.shaderController.applyCompiledShader();
      });
    }

    if (toggleEditorBtn) {
      toggleEditorBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.editor.toggleEditor();
        this.uiController.updateEditorButton();
      });
    }

    if (toggleModeBtn) {
      toggleModeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.editor.switchEditMode();
        this.uiController.updateModeButton();
      });
    }

    if (helpBtn) {
      helpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.uiController.showHelpModal();
      });
    }

    // Initialize mobile button states
    this.uiController.initializeButtonStates();

    // Setup modal close button
    document.getElementById('closeHelp')?.addEventListener('click', () => {
      this.uiController.hideHelpModal();
    });
  }
}
