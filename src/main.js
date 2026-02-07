import { Audio } from './audio/Audio.js';
import { SoundGL } from './gl/SoundGL.js';
import { VisualGL } from './gl/VisualGL.js';
import { ShaderTemplates } from './gl/shader-templates.js';
import { Editor } from './editor/Editor.js';
import { AppState } from './state/AppState.js';
import { StatusManager } from './state/StatusManager.js';
import { loadShader } from './utils/storage.js';
import { UIController } from './controllers/UIController.js';
import { PlaybackController } from './controllers/PlaybackController.js';
import { ShaderController } from './controllers/ShaderController.js';
import { InputHandler } from './controllers/InputHandler.js';

/**
 * AudioVisualizerSystem - アプリケーションのファサード
 * 各コントローラーを初期化し、コンポーネント間の連携を管理
 */
class AudioVisualizerSystem {
  constructor() {
    // Core components
    this.appState = new AppState();
    this.statusManager = new StatusManager(this.appState);
    this.soundGL = new SoundGL();
    this.visualGL = new VisualGL();
    this.audio = new Audio();

    // Load saved shaders or use defaults
    const savedSoundCode = loadShader('sound') || ShaderTemplates.defaultSoundCode;
    const savedVisualCode = loadShader('visual') || ShaderTemplates.defaultVisualCode;

    // Editor with callbacks
    this.editor = new Editor({
      editMode: 'sound',
      isEditorVisible: true,
      onCodeChange: (mode, code) => {},
      onModeSwitch: (oldMode, newMode) => {
        this.uiController?.updateModeButton();
      },
      onVisibilityToggle: (isVisible) => {
        this.uiController?.updateEditorButton();
      }
    });

    this.editor.setCode('sound', savedSoundCode);
    this.editor.setCode('visual', savedVisualCode);

    // Controllers (initialized after core components)
    this.uiController = new UIController(this.appState, this.editor, this.statusManager);
    this.playbackController = new PlaybackController(
      this.audio,
      this.appState,
      this.statusManager,
      this.uiController
    );
    this.shaderController = new ShaderController(
      this.soundGL,
      this.visualGL,
      this.editor,
      this.statusManager,
      this.appState,
      this.uiController
    );
    this.inputHandler = new InputHandler(
      this.playbackController,
      this.shaderController,
      this.uiController,
      this.editor,
      this.appState
    );

    this.setupCallbacks();
    this.init();
    this.setupServiceWorker();
  }

  /**
   * オーディオバッファ生成コールバックとイベントリスナーをセットアップ
   */
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

  /**
   * アプリケーション初期化
   */
  async init() {
    try {
      this.editor.initEditor();
      this.visualGL.init();
      this.shaderController.initDefaultShaders();
      await this.audio.init();

      this.appState.setAudioContext(this.audio.audioContext);
      this.statusManager.startStatusUpdate();
      this.playbackController.startAnimationLoop(this.visualGL);
      this.inputHandler.setupEventListeners();

      this.statusManager.updateStatusLine('Initialized', 'ready');
    } catch (error) {
      this.statusManager.updateStatusLine(`ERR: ${error.message}`, 'error');
      console.error('Init error:', error);
    }
  }

  /**
   * Service Worker をセットアップ
   */
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('[App] Service Worker registered'))
        .catch((error) => console.error('[App] Service Worker registration failed:', error));

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }
}

const audioSystem = new AudioVisualizerSystem();
