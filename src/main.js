/**
 * Beatty - main.js
 * Facade module: wires all components together, contains no logic
 */

import { AudioAnalyzer } from './audio/AudioAnalyzer.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { createAudioScheduler } from './audio/AudioScheduler.js';
import { createPlaybackController } from './controllers/PlaybackController.js';
import { createPresetController } from './controllers/PresetController.js';
import { createShaderController } from './controllers/ShaderController.js';
import { createUIController } from './controllers/UIController.js';
import { Editor } from './editor/Editor.js';
import { SoundRenderer } from './gl/SoundRenderer.js';
import { DEFAULT_SOUND_SHADER, DEFAULT_VISUAL_SHADER } from './gl/shader-templates.js';
import { VisualRenderer } from './gl/VisualRenderer.js';
import { createKeyboardController } from './input/KeyboardController.js';
import { createMobileController } from './input/MobileController.js';
import { createModalController } from './input/ModalController.js';
import { createAudioSettings } from './state/AudioSettings.js';
import { createEventBus } from './state/EventBus.js';
import { createPlaybackState } from './state/PlaybackState.js';
import { createDebugOverlay } from './ui/DebugOverlay.js';
import { createSettingsModal } from './ui/SettingsModal.js';
import { createStatusDisplay } from './ui/StatusDisplay.js';
import { createToolbarController } from './ui/ToolbarController.js';
import { EVENTS, UI } from './utils/consts.js';
import { createErrorHandler } from './utils/errors.js';
import { loadShader } from './utils/storage.js';

async function init() {
  // Layer 0-1: State
  const eventBus = createEventBus();
  const playbackState = createPlaybackState(eventBus);
  const audioSettings = createAudioSettings(eventBus, {
    isPlayingCheck: () => playbackState.isPlaying,
  });

  // Layer 2: Core modules
  const audioEngine = new AudioEngine();
  const audioAnalyzer = new AudioAnalyzer();
  const soundRenderer = new SoundRenderer();
  const visualRenderer = new VisualRenderer();

  const editor = new Editor({ eventBus });

  // Layer 2: UI
  const statusDisplay = createStatusDisplay({
    eventBus,
    playbackState,
    audioSettings,
    getCurrentTime: () => playbackState.getCurrentTime(audioEngine.audioContext),
  });

  const errorHandler = createErrorHandler(statusDisplay);

  const debugOverlay = createDebugOverlay({
    audioEngine,
    audioAnalyzer,
  });

  // Layer 2: Audio scheduling (injects generateBuffer to decouple Audio↔GL)
  const audioScheduler = createAudioScheduler({
    generateBuffer: (blockOffset) =>
      soundRenderer.generateAudioBuffer(blockOffset, audioSettings.bpm, audioSettings.sampleRate),
    audioSettings,
    audioEngine,
  });

  // Wire audioEngine's next-buffer request to audioScheduler
  audioEngine.onRequestNextBuffer = () => audioScheduler.requestNextBuffer();

  // Layer 3: Controllers
  const playbackController = createPlaybackController({
    audioEngine,
    audioAnalyzer,
    audioScheduler,
    playbackState,
    audioSettings,
    visualRenderer,
    eventBus,
    errorHandler,
    debugOverlay,
  });

  const shaderController = createShaderController({
    soundRenderer,
    visualRenderer,
    editor,
    statusDisplay,
    eventBus,
    errorHandler,
  });

  const uiController = createUIController({
    playbackState,
    audioSettings,
    editor,
    eventBus,
  });

  // Layer 3: Preset management
  const presetController = createPresetController({
    editor,
    initShaders: shaderController.initShaders,
    eventBus,
  });

  const settingsModal = createSettingsModal({
    eventBus,
    editor,
    onLoad: (presetId) => presetController.loadPreset(presetId),
  });

  const toolbarController = createToolbarController({
    editor,
    uiController,
    settingsModal,
    eventBus,
  });

  // Layer 3: Input
  const keyboardController = createKeyboardController({
    playbackController,
    shaderController,
    uiController,
    editor,
    settingsModal,
    debugOverlay,
  });

  const mobileController = createMobileController({
    playbackController,
    shaderController,
    uiController,
    editor,
    audioSettings,
    audioEngine,
    eventBus,
  });

  const modalController = createModalController({ uiController, settingsModal });

  // Volume sync via EventBus (store unsubscriber for cleanup)
  const unsubscribeVolumeChanged = eventBus.on(EVENTS.VOLUME_CHANGED, ({ new: newVolume }) => {
    audioEngine.setVolume(newVolume);
  });

  // Initialize
  try {
    // Load saved shaders or defaults
    const soundCode = loadShader('sound') || DEFAULT_SOUND_SHADER;
    const visualCode = loadShader('visual') || DEFAULT_VISUAL_SHADER;

    editor.setCode('sound', soundCode);
    editor.setCode('visual', visualCode);
    editor.init();

    visualRenderer.init();
    shaderController.initShaders(soundCode, visualCode);

    await audioEngine.init();
    audioSettings.setSampleRate(audioEngine.sampleRate);

    statusDisplay.init();
    statusDisplay.startUpdates();

    playbackController.startAnimationLoop();

    keyboardController.init();
    mobileController.init();
    modalController.init();
    settingsModal.init();
    toolbarController.init();
    debugOverlay.init();

    // Resize handling
    window.addEventListener('resize', () => playbackController.handleResize());

    statusDisplay.showStatus(null, UI.STATUS_TYPES.READY);
    uiController.initButtonStates();
  } catch (error) {
    errorHandler(error);
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    unsubscribeVolumeChanged();
    playbackController.destroy();
    keyboardController.destroy();
    mobileController.destroy();
    modalController.destroy();
    settingsModal.destroy();
    toolbarController.destroy();
    presetController.destroy();
    debugOverlay.destroy();
    statusDisplay.destroy();
    uiController.destroy();
    shaderController.destroy();
    audioScheduler.destroy();
    audioAnalyzer.destroy();
    audioEngine.destroy();
    soundRenderer.destroy();
    visualRenderer.destroy();
    editor.destroy();
    playbackState.destroy();
    audioSettings.destroy();
    eventBus.destroy();
  });

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((error) => console.error('[App] SW registration failed:', error));

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
}

init();
