import { Audio } from './audio.js';
import { SoundGL } from './SoundGL.js';
import { VisualGL } from './VisualGL.js';
import { Editor } from './editor.js';
import { AppState } from './AppState.js';
import { StatusManager } from './StatusManager.js';
import { ShaderTemplates } from './shader-templates.js';
import { saveShader, loadShader, getStorageInfo } from './storage.js';

class AudioVisualizerSystem {
  constructor() {
    // State manage
    this.appState = new AppState();
    this.statusManager = new StatusManager(this.appState);
    
    // Sound/Visual
    this.soundGL = new SoundGL();
    this.visualGL = new VisualGL();
    
    // Audio
    this.audio = new Audio();

    // Status message timer
    this.statusMessageTimer = null;

    // Load saved shaders or use defaults
    const savedSoundCode = loadShader('sound') || ShaderTemplates.defaultSoundCode;
    const savedVisualCode = loadShader('visual') || ShaderTemplates.defaultVisualCode;

    // Editor
    this.editor = new Editor({
      editMode: 'sound',
      currentSoundCode: savedSoundCode,
      currentVisualCode: savedVisualCode,
      isEditorVisible: true,
      onCodeChange: (mode, code) => {},
      onModeSwitch: (oldMode, newMode) => {
        this.updateMobileModeButton();
      },
      onVisibilityToggle: (isVisible) => {
        this.updateMobileEditorButton();
      }
    });

    this.setupCallbacks();
    
    this.init();
  }

  setupCallbacks() {
    this.audio.generateBufferCallback = (blockOffset) => {
      const secondsPerBar = 60.0 / this.appState.bpm * 4;
      const nextBlockOffset = this.appState.currentBlockOffset + secondsPerBar;
    
      this.appState.currentBlockOffset = nextBlockOffset;
      
      return this.soundGL.generateAudioBuffer(
        nextBlockOffset,
        this.appState.bpm,
        this.appState.sampleRate
      );
    };

    this.appState.on('bpmChanged', ({ new: newBpm }) => {
      // BPM変更時の処理
    });

    this.appState.on('volumeChanged', ({ new: newVolume }) => {
      this.audio.setVolume(newVolume);
    });
  }

  async init() {
    try {
      this.editor.initEditor();
      this.visualGL.init();
      await this.initDefaultShaders();
      await this.audio.init();

      this.appState.setAudioContext(this.audio.audioContext);
      this.statusManager.startStatusUpdate();
      this.startAnimationLoop();
      this.setupEventListeners();
      
      this.statusManager.updateStatusLine('Initialized', 'ready');
    } catch (error) {
      this.statusManager.updateStatusLine(`ERR: ${error.message}`, 'error');
      console.error('Init error:', error);
    }
  }

  async initDefaultShaders() {
    // Use saved shaders or defaults
    const soundCode = this.editor.currentSoundCode;
    const visualCode = this.editor.currentVisualCode;
    
    this.soundGL.compile(soundCode);
    this.visualGL.compile(visualCode);
    
    // Log storage info
    const storageInfo = getStorageInfo();
    if (storageInfo.hasSound || storageInfo.hasVisual) {
      console.log('[Storage] Loaded saved shaders:', storageInfo);
    }
  }

  startAnimationLoop() {
    const animate = () => {
      if (this.appState.isPlaying) {
        this.audio.analyzeAudioData();
      }
      
      this.visualGL.render(
        this.audio.audioAnalyzer.getAnalysisValues(),
        this.appState
      );
      
      requestAnimationFrame(animate);
    };
    animate();
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      // ESCキーでヘルプモーダルを閉じる
      if (e.key === 'Escape') {
        this.hideHelpModal();
        return;
      }
      
      if ((e.ctrlKey || e.metaKey)) {
        switch (e.key) {
          case 'p':
            e.preventDefault();
            this.togglePlayback();
            break;
          case 's':
            e.preventDefault();
            this.compileShader();
            break;
          case 'r':
            e.preventDefault();
            this.applyCompiledShader();
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
            this.resetPlayback();
            break;
        }
      }
    });
    
    document.getElementById('bpmStatus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSliderPopup('bpm', e);
    });

    document.getElementById('volumeStatus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSliderPopup('volume', e);
    });

    document.getElementById('helpStatus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showHelpModal();
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
        this.hideAllSliderPopups();
      }
      if (!e.target.closest('.modal-content') && !e.target.closest('#helpStatus') && !e.target.closest('#mobileHelp')) {
        this.hideHelpModal();
      }
    });

    // Mobile control buttons event listeners
    this.setupMobileControls();
  }

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
        this.togglePlayback();
        this.updateMobilePlayButton();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetPlayback();
        this.updateMobilePlayButton();
      });
    }

    if (compileBtn) {
      compileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.compileShader();
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.applyCompiledShader();
      });
    }

    if (toggleEditorBtn) {
      toggleEditorBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.editor.toggleEditor();
        this.updateMobileEditorButton();
      });
    }

    if (toggleModeBtn) {
      toggleModeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.editor.switchEditMode();
        this.updateMobileModeButton();
      });
    }

    if (helpBtn) {
      helpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showHelpModal();
      });
    }

    // Initialize mobile button states
    this.updateMobilePlayButton();
    this.updateMobileEditorButton();
    this.updateMobileModeButton();
    
    // Setup modal close button
    document.getElementById('closeHelp')?.addEventListener('click', () => {
      this.hideHelpModal();
    });
  }

  updateMobilePlayButton() {
    const playToggleBtn = document.getElementById('mobilePlayToggle');
    if (playToggleBtn) {
      if (this.appState.isPlaying) {
        playToggleBtn.classList.add('active');
        playToggleBtn.textContent = '⏸';
        playToggleBtn.title = 'Pause';
      } else {
        playToggleBtn.classList.remove('active');
        playToggleBtn.textContent = '▶';
        playToggleBtn.title = 'Play';
      }
    }
  }

  updateMobileEditorButton() {
    const toggleEditorBtn = document.getElementById('mobileToggleEditor');
    if (toggleEditorBtn) {
      if (this.editor.isEditorVisible) {
        toggleEditorBtn.classList.add('active');
        toggleEditorBtn.textContent = '👁';
        toggleEditorBtn.title = 'Hide Editor';
      } else {
        toggleEditorBtn.classList.remove('active');
        toggleEditorBtn.textContent = '📝';
        toggleEditorBtn.title = 'Show Editor';
      }
    }
  }

  updateMobileModeButton() {
    const toggleModeBtn = document.getElementById('mobileToggleMode');
    if (toggleModeBtn) {
      if (this.editor.editMode === 'sound') {
        toggleModeBtn.textContent = '🎵';
        toggleModeBtn.title = 'Switch to Visual Mode';
      } else {
        toggleModeBtn.textContent = '🎨';
        toggleModeBtn.title = 'Switch to Sound Mode';
      }
    }
  }

  async togglePlayback() {
    try {
      if (this.appState.isPlaying) {
        this.audio.pause();
        this.appState.recordPauseTime();
        this.appState.setPlayState(false, true);
        this.statusManager.updateStatusLine('Paused - Press ⌘P to Resume', 'ready');
      } else if (this.appState.isPaused) {
        await this.audio.resume(this.appState.volume, this.appState.pausedReadPos);
        this.appState.recordStartTime();
        this.appState.setPlayState(true, false);
        this.statusManager.updateStatusLine('Playing - Press ⌘P to Pause', 'ready');
      } else {
        await this.audio.start(this.appState.volume);
        this.appState.recordStartTime(); 
        this.appState.setPlayState(true, false);
        this.statusManager.updateStatusLine('Playing - Press ⌘P to Pause', 'ready');
      }
      this.updateMobilePlayButton();
    } catch (error) {
      this.statusManager.updateStatusLine(`ERR[PLAYBACK]: ${error.message}`, 'error');
      console.error('Playback error:', error);
    }
  }

  async resetPlayback() {
    try {
      this.audio.stop();
      this.appState.resetTiming();
      this.appState.setPlayState(false, false);
      this.statusManager.updateStatusLine('Reset - Press ⌘P to Start', 'ready');
      this.updateMobilePlayButton();
    } catch (error) {
      this.statusManager.updateStatusLine(`ERR[RESET]: ${error.message}`, 'error');
    }
  }

  async compileShader() {
    try {
      const currentMode = this.editor.editMode;
      const code = this.editor.getCurrentEditCode();
      
      if (currentMode === 'sound') {
        this.soundGL.compile(code);
        // Auto-save on successful compilation
        saveShader('sound', code);
        this.statusManager.updateStatusLine('Sound Compiled & Saved - Apply with ⌘R', 'success');
      } else {
        this.visualGL.compile(code);
        // Auto-save on successful compilation
        saveShader('visual', code);
        this.statusManager.updateStatusLine('Visual Compiled & Saved - Apply with ⌘R', 'success');
      }
      
      // Clear message after 3 seconds (longer for compile message to read apply instruction)
      this.clearStatusMessageAfter(3000);
    } catch (error) {
      this.statusManager.updateStatusLine(`ERR: ${error.message}`, 'error');
    }
  }

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
      
      // Clear message after 2 seconds
      this.clearStatusMessageAfter(2000);
    } catch (error) {
      this.statusManager.updateStatusLine(`ERR: ${error.message}`, 'error');
    }
  }

  /**
   * Clear status message after specified delay
   * @param {number} delay - Delay in milliseconds
   */
  clearStatusMessageAfter(delay) {
    // Clear any existing timer
    if (this.statusMessageTimer) {
      clearTimeout(this.statusMessageTimer);
    }
    
    // Set new timer
    this.statusMessageTimer = setTimeout(() => {
      this.statusManager.updateStatusLine('Ready', 'ready');
      this.statusMessageTimer = null;
    }, delay);
  }

  showSliderPopup(type, event) {
    this.hideAllSliderPopups();
    
    const popup = document.getElementById(`${type}SliderPopup`);
    const slider = document.getElementById(`${type}Slider`);
    const valueDisplay = document.getElementById(`${type}Value`);
    
    if (!popup || !slider) return;
    
    if (type === 'bpm') {
      slider.value = this.appState.bpm;
      if (valueDisplay) valueDisplay.textContent = this.appState.bpm;
    } else if (type === 'volume') {
      slider.value = this.appState.volume;
      if (valueDisplay) valueDisplay.textContent = this.appState.volume.toFixed(1);
    }
    

    const rect = event.target.getBoundingClientRect();
    popup.style.right = '25px';
    popup.style.bottom = (window.innerHeight - rect.top + 13) + 'px';
    popup.classList.add('visible');
  }

  hideAllSliderPopups() {
    const popupIds = ['bpmSliderPopup', 'volumeSliderPopup'];
  
    popupIds.forEach(id => {
      const popup = document.getElementById(id);
      if (popup) {
        popup.classList.remove('visible');
      }
    });
  }

  showHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
      modal.classList.add('visible');
      // フォーカストラップのため、モーダル内の最初の要素にフォーカスを当てる
      const closeButton = document.getElementById('closeHelp');
      if (closeButton) {
        closeButton.focus();
      }
    }
  }

  hideHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
      modal.classList.remove('visible');
    }
  }
}

const audioSystem = new AudioVisualizerSystem();