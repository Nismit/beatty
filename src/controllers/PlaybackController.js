/**
 * PlaybackController - 再生/一時停止/リセットの制御
 */
export class PlaybackController {
  constructor(audio, appState, statusManager, uiController) {
    this.audio = audio;
    this.appState = appState;
    this.statusManager = statusManager;
    this.uiController = uiController;
  }

  /**
   * 再生/一時停止をトグル
   */
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
      this.uiController.updatePlayButton();
    } catch (error) {
      this.statusManager.updateStatusLine(`ERR[PLAYBACK]: ${error.message}`, 'error');
      console.error('Playback error:', error);
    }
  }

  /**
   * 再生をリセット
   */
  async resetPlayback() {
    try {
      this.audio.stop();
      this.appState.resetTiming();
      this.appState.setPlayState(false, false);
      this.statusManager.updateStatusLine('Reset - Press ⌘P to Start', 'ready');
      this.uiController.updatePlayButton();
    } catch (error) {
      this.statusManager.updateStatusLine(`ERR[RESET]: ${error.message}`, 'error');
    }
  }

  /**
   * アニメーションループを開始
   * @param {VisualGL} visualGL - ビジュアルシェーダーインスタンス
   */
  startAnimationLoop(visualGL) {
    const animate = () => {
      if (this.appState.isPlaying) {
        this.audio.analyzeAudioData();
      }

      visualGL.render(
        this.audio.audioAnalyzer.getAnalysisValues(),
        this.appState
      );

      requestAnimationFrame(animate);
    };
    animate();
  }
}
