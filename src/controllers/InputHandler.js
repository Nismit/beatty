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

    // イベントハンドラ参照を保持（削除時に使用）
    this.boundHandlers = {
      keydown: null,
      documentClick: null,
      bpmStatusClick: null,
      volumeStatusClick: null,
      helpStatusClick: null,
      bpmSliderInput: null,
      volumeSliderInput: null,
      mobilePlayToggle: null,
      mobileReset: null,
      mobileCompile: null,
      mobileApply: null,
      mobileToggleEditor: null,
      mobileToggleMode: null,
      mobileHelp: null,
      closeHelp: null,
    };

    // DOM要素参照をキャッシュ
    this.elements = {};
  }

  /**
   * 全イベントリスナーをセットアップ
   */
  setupEventListeners() {
    this.cacheElements();
    this.setupKeyboardHandlers();
    this.setupClickHandlers();
    this.setupMobileControls();
  }

  /**
   * DOM要素をキャッシュ
   */
  cacheElements() {
    this.elements = {
      bpmStatus: document.getElementById('bpmStatus'),
      volumeStatus: document.getElementById('volumeStatus'),
      helpStatus: document.getElementById('helpStatus'),
      bpmSlider: document.getElementById('bpmSlider'),
      volumeSlider: document.getElementById('volumeSlider'),
      mobilePlayToggle: document.getElementById('mobilePlayToggle'),
      mobileReset: document.getElementById('mobileReset'),
      mobileCompile: document.getElementById('mobileCompile'),
      mobileApply: document.getElementById('mobileApply'),
      mobileToggleEditor: document.getElementById('mobileToggleEditor'),
      mobileToggleMode: document.getElementById('mobileToggleMode'),
      mobileHelp: document.getElementById('mobileHelp'),
      closeHelp: document.getElementById('closeHelp'),
    };
  }

  /**
   * キーボードショートカットをセットアップ
   */
  setupKeyboardHandlers() {
    this.boundHandlers.keydown = (e) => {
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
    };

    document.addEventListener('keydown', this.boundHandlers.keydown);
  }

  /**
   * クリックハンドラをセットアップ
   */
  setupClickHandlers() {
    // BPM Status
    if (this.elements.bpmStatus) {
      this.boundHandlers.bpmStatusClick = (e) => {
        e.stopPropagation();
        this.uiController.showSliderPopup('bpm', e);
      };
      this.elements.bpmStatus.addEventListener('click', this.boundHandlers.bpmStatusClick);
    }

    // Volume Status
    if (this.elements.volumeStatus) {
      this.boundHandlers.volumeStatusClick = (e) => {
        e.stopPropagation();
        this.uiController.showSliderPopup('volume', e);
      };
      this.elements.volumeStatus.addEventListener('click', this.boundHandlers.volumeStatusClick);
    }

    // Help Status
    if (this.elements.helpStatus) {
      this.boundHandlers.helpStatusClick = (e) => {
        e.stopPropagation();
        this.uiController.showHelpModal();
      };
      this.elements.helpStatus.addEventListener('click', this.boundHandlers.helpStatusClick);
    }

    // BPM Slider
    if (this.elements.bpmSlider) {
      this.boundHandlers.bpmSliderInput = (e) => {
        const bpm = parseInt(e.target.value);
        this.appState.setBpm(bpm);
      };
      this.elements.bpmSlider.addEventListener('input', this.boundHandlers.bpmSliderInput);
    }

    // Volume Slider
    if (this.elements.volumeSlider) {
      this.boundHandlers.volumeSliderInput = (e) => {
        const volume = parseFloat(e.target.value);
        this.appState.setVolume(volume);
      };
      this.elements.volumeSlider.addEventListener('input', this.boundHandlers.volumeSliderInput);
    }

    // Document click (close popups/modals)
    this.boundHandlers.documentClick = (e) => {
      if (!e.target.closest('.slider-popup') && !e.target.closest('.status-clickable')) {
        this.uiController.hideAllSliderPopups();
      }
      if (!e.target.closest('.modal-content') && !e.target.closest('#helpStatus') && !e.target.closest('#mobileHelp')) {
        this.uiController.hideHelpModal();
      }
    };
    document.addEventListener('click', this.boundHandlers.documentClick);
  }

  /**
   * モバイルコントロールをセットアップ
   */
  setupMobileControls() {
    // Play Toggle
    if (this.elements.mobilePlayToggle) {
      this.boundHandlers.mobilePlayToggle = (e) => {
        e.preventDefault();
        this.playbackController.togglePlayback();
      };
      this.elements.mobilePlayToggle.addEventListener('click', this.boundHandlers.mobilePlayToggle);
    }

    // Reset
    if (this.elements.mobileReset) {
      this.boundHandlers.mobileReset = (e) => {
        e.preventDefault();
        this.playbackController.resetPlayback();
      };
      this.elements.mobileReset.addEventListener('click', this.boundHandlers.mobileReset);
    }

    // Compile
    if (this.elements.mobileCompile) {
      this.boundHandlers.mobileCompile = (e) => {
        e.preventDefault();
        this.shaderController.compileShader();
      };
      this.elements.mobileCompile.addEventListener('click', this.boundHandlers.mobileCompile);
    }

    // Apply
    if (this.elements.mobileApply) {
      this.boundHandlers.mobileApply = (e) => {
        e.preventDefault();
        this.shaderController.applyCompiledShader();
      };
      this.elements.mobileApply.addEventListener('click', this.boundHandlers.mobileApply);
    }

    // Toggle Editor
    if (this.elements.mobileToggleEditor) {
      this.boundHandlers.mobileToggleEditor = (e) => {
        e.preventDefault();
        this.editor.toggleEditor();
        this.uiController.updateEditorButton();
      };
      this.elements.mobileToggleEditor.addEventListener('click', this.boundHandlers.mobileToggleEditor);
    }

    // Toggle Mode
    if (this.elements.mobileToggleMode) {
      this.boundHandlers.mobileToggleMode = (e) => {
        e.preventDefault();
        this.editor.switchEditMode();
        this.uiController.updateModeButton();
      };
      this.elements.mobileToggleMode.addEventListener('click', this.boundHandlers.mobileToggleMode);
    }

    // Help
    if (this.elements.mobileHelp) {
      this.boundHandlers.mobileHelp = (e) => {
        e.preventDefault();
        this.uiController.showHelpModal();
      };
      this.elements.mobileHelp.addEventListener('click', this.boundHandlers.mobileHelp);
    }

    // Initialize mobile button states
    this.uiController.initializeButtonStates();

    // Close Help
    if (this.elements.closeHelp) {
      this.boundHandlers.closeHelp = () => {
        this.uiController.hideHelpModal();
      };
      this.elements.closeHelp.addEventListener('click', this.boundHandlers.closeHelp);
    }
  }

  /**
   * 全イベントリスナーを削除
   */
  removeEventListeners() {
    // Keyboard
    if (this.boundHandlers.keydown) {
      document.removeEventListener('keydown', this.boundHandlers.keydown);
    }

    // Document click
    if (this.boundHandlers.documentClick) {
      document.removeEventListener('click', this.boundHandlers.documentClick);
    }

    // Status clicks
    if (this.elements.bpmStatus && this.boundHandlers.bpmStatusClick) {
      this.elements.bpmStatus.removeEventListener('click', this.boundHandlers.bpmStatusClick);
    }
    if (this.elements.volumeStatus && this.boundHandlers.volumeStatusClick) {
      this.elements.volumeStatus.removeEventListener('click', this.boundHandlers.volumeStatusClick);
    }
    if (this.elements.helpStatus && this.boundHandlers.helpStatusClick) {
      this.elements.helpStatus.removeEventListener('click', this.boundHandlers.helpStatusClick);
    }

    // Sliders
    if (this.elements.bpmSlider && this.boundHandlers.bpmSliderInput) {
      this.elements.bpmSlider.removeEventListener('input', this.boundHandlers.bpmSliderInput);
    }
    if (this.elements.volumeSlider && this.boundHandlers.volumeSliderInput) {
      this.elements.volumeSlider.removeEventListener('input', this.boundHandlers.volumeSliderInput);
    }

    // Mobile controls
    if (this.elements.mobilePlayToggle && this.boundHandlers.mobilePlayToggle) {
      this.elements.mobilePlayToggle.removeEventListener('click', this.boundHandlers.mobilePlayToggle);
    }
    if (this.elements.mobileReset && this.boundHandlers.mobileReset) {
      this.elements.mobileReset.removeEventListener('click', this.boundHandlers.mobileReset);
    }
    if (this.elements.mobileCompile && this.boundHandlers.mobileCompile) {
      this.elements.mobileCompile.removeEventListener('click', this.boundHandlers.mobileCompile);
    }
    if (this.elements.mobileApply && this.boundHandlers.mobileApply) {
      this.elements.mobileApply.removeEventListener('click', this.boundHandlers.mobileApply);
    }
    if (this.elements.mobileToggleEditor && this.boundHandlers.mobileToggleEditor) {
      this.elements.mobileToggleEditor.removeEventListener('click', this.boundHandlers.mobileToggleEditor);
    }
    if (this.elements.mobileToggleMode && this.boundHandlers.mobileToggleMode) {
      this.elements.mobileToggleMode.removeEventListener('click', this.boundHandlers.mobileToggleMode);
    }
    if (this.elements.mobileHelp && this.boundHandlers.mobileHelp) {
      this.elements.mobileHelp.removeEventListener('click', this.boundHandlers.mobileHelp);
    }
    if (this.elements.closeHelp && this.boundHandlers.closeHelp) {
      this.elements.closeHelp.removeEventListener('click', this.boundHandlers.closeHelp);
    }

    // Clear references
    this.boundHandlers = {};
    this.elements = {};
  }
}
