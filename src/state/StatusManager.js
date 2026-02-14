import { APP, UI } from '../utils/consts.js';

export class StatusManager {
  constructor(appState) {
    this.appState = appState;
    this.statusUpdateInterval = null;
    this.setupStateListeners();
  }

  setupStateListeners() {
    this.appState.on('bpmChanged', ({ new: newBpm }) => {
      this.updateBpmDisplay(newBpm);
    });

    this.appState.on('volumeChanged', ({ new: newVolume }) => {
      this.updateVolumeDisplay(newVolume);
    });

    this.appState.on('playStateChanged', ({ new: newState }) => {
      this.updatePlayStateDisplay(newState);
    });
  }

  /**
   * 初期化時にUIを現在の状態で更新
   */
  initializeDisplays() {
    this.updateBpmDisplay(this.appState.bpm);
    this.updateVolumeDisplay(this.appState.volume);
    this.updatePlayStateDisplay({
      isPlaying: this.appState.isPlaying,
      isPaused: this.appState.isPaused,
    });
  }

  updateBpmDisplay(bpm) {
    const elements = ['bpmValue', 'statusBpm'];
    elements.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = bpm;
    });

    const slider = document.getElementById('bpmSlider');
    if (slider) slider.value = bpm;
  }

  updateVolumeDisplay(volume) {
    const volumeText = volume.toFixed(1);
    const elements = ['volumeValue', 'statusVolume'];
    elements.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = volumeText;
    });

    const slider = document.getElementById('volumeSlider');
    if (slider) slider.value = volume;
  }

  updatePlayStateDisplay({ isPlaying, isPaused }) {
    const playStateElement = document.getElementById('statusPlayState');
    if (!playStateElement) return;

    let playState, stateClass;
    if (isPlaying) {
      playState = 'PLAY';
      stateClass = 'status-playing';
    } else if (isPaused) {
      playState = 'PAUSED';
      stateClass = 'status-paused';
    } else {
      playState = 'PAUSE';
      stateClass = 'status-paused';
    }

    playStateElement.textContent = playState;
    playStateElement.className = stateClass;
  }

  updateStatusLine(message, type = UI.STATUS_TYPES.READY) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
      statusText.textContent = message;
      statusText.className = `status-${type}`;
    }
  }

  updateBarsDisplay(bars) {
    const element = document.getElementById('statusBars');
    if (element) element.textContent = bars;
  }

  updateTimeDisplay() {
    if (!this.appState.isPlaying) return;

    const currentBars = this.appState.currentBars;
    if (currentBars !== undefined) {
      this.updateBarsDisplay(currentBars.toFixed(0));
    }
  }

  startStatusUpdate() {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
    }

    this.statusUpdateInterval = setInterval(() => {
      this.updateCurrentBars();
      this.updateTimeDisplay();
    }, APP.STATUS_UPDATE_INTERVAL);
  }

  updateCurrentBars() {
    if (!this.appState.isPlaying) return;

    const currentTime = this.appState.getCurrentTime();
    const bpm = this.appState.bpm;

    const beatsPerSecond = bpm / 60;
    const beatsElapsed = currentTime * beatsPerSecond;
    const barsElapsed = beatsElapsed / 4;

    this.appState.currentBars = barsElapsed;
    this.updateBarsDisplay(barsElapsed.toFixed(0));
  }

  /**
   * ステータス更新を停止しリソースをクリーンアップ
   */
  stopStatusUpdate() {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
  }

  /**
   * インスタンス破棄時のクリーンアップ
   */
  destroy() {
    this.stopStatusUpdate();
  }
}
