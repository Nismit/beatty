/**
 * UIController - UI状態の管理とモーダル/ポップアップ制御
 */
export class UIController {
  constructor(appState, editor, statusManager) {
    this.appState = appState;
    this.editor = editor;
    this.statusManager = statusManager;
    this.statusMessageTimer = null;
  }

  /**
   * 再生ボタンの状態を更新
   */
  updatePlayButton() {
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

  /**
   * エディタ表示ボタンの状態を更新
   */
  updateEditorButton() {
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

  /**
   * モード切替ボタンの状態を更新
   */
  updateModeButton() {
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

  /**
   * スライダーポップアップを表示
   * @param {string} type - 'bpm' または 'volume'
   * @param {Event} event - クリックイベント
   */
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
    popup.style.bottom = `${window.innerHeight - rect.top + 13}px`;
    popup.classList.add('visible');
  }

  /**
   * 全スライダーポップアップを非表示
   */
  hideAllSliderPopups() {
    const popupIds = ['bpmSliderPopup', 'volumeSliderPopup'];

    popupIds.forEach((id) => {
      const popup = document.getElementById(id);
      if (popup) {
        popup.classList.remove('visible');
      }
    });
  }

  /**
   * ヘルプモーダルを表示
   */
  showHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
      modal.classList.add('visible');
      const closeButton = document.getElementById('closeHelp');
      if (closeButton) {
        closeButton.focus();
      }
    }
  }

  /**
   * ヘルプモーダルを非表示
   */
  hideHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
      modal.classList.remove('visible');
    }
  }

  /**
   * 指定時間後にステータスメッセージをクリア
   * @param {number} delay - 遅延時間 (ミリ秒)
   */
  clearStatusMessageAfter(delay) {
    if (this.statusMessageTimer) {
      clearTimeout(this.statusMessageTimer);
    }

    this.statusMessageTimer = setTimeout(() => {
      this.statusManager.updateStatusLine('Ready', 'ready');
      this.statusMessageTimer = null;
    }, delay);
  }

  /**
   * 全ボタン状態を初期化
   */
  initializeButtonStates() {
    this.updatePlayButton();
    this.updateEditorButton();
    this.updateModeButton();
  }
}
