/**
 * PlaybackController factory function
 * Manages play/pause/reset lifecycle and animation loop
 */

import { EVENTS } from '../utils/consts.js';

/**
 * @param {Object} deps
 * @param {import('../audio/AudioEngine.js').AudioEngine} deps.audioEngine
 * @param {import('../audio/AudioAnalyzer-new.js').AudioAnalyzer} deps.audioAnalyzer
 * @param {import('../audio/AudioScheduler.js').AudioScheduler} deps.audioScheduler
 * @param {import('../state/PlaybackState.js').PlaybackState} deps.playbackState
 * @param {import('../state/AudioSettings.js').AudioSettings} deps.audioSettings
 * @param {import('../gl/VisualRenderer.js').VisualRenderer} deps.visualRenderer
 * @param {import('../ui/StatusDisplay.js').StatusDisplay} deps.statusDisplay
 * @param {import('../state/EventBus.js').EventBus} deps.eventBus
 * @param {function(Error): void} deps.errorHandler
 */
export function createPlaybackController({
  audioEngine,
  audioAnalyzer,
  audioScheduler,
  playbackState,
  audioSettings,
  visualRenderer,
  statusDisplay,
  eventBus,
  errorHandler,
}) {
  let animationFrameId = null;

  async function togglePlayback() {
    try {
      if (playbackState.isPlaying) {
        // Playing → Pause
        audioEngine.pause();
        playbackState.recordPauseTime(
          audioEngine.audioContext.currentTime,
          audioSettings.getSamplesPerBar(),
        );
        playbackState.setPlaying(false, true);
        statusDisplay.showStatus('Paused');
      } else if (playbackState.isPaused) {
        // Paused → Resume
        await audioEngine.resume(audioSettings.volume, playbackState.pausedReadPos);
        playbackState.recordStartTime(audioEngine.audioContext.currentTime);
        playbackState.setPlaying(true, false);
        statusDisplay.showStatus('Playing');
      } else {
        // Stopped → Start
        const initialBuffer = await audioScheduler.requestInitialBuffer();
        await audioEngine.start(initialBuffer, audioSettings.volume);
        playbackState.recordStartTime(audioEngine.audioContext.currentTime);
        playbackState.setPlaying(true, false);
        statusDisplay.showStatus('Playing');

        // Pre-generate next buffer
        audioScheduler.requestNextBuffer();
      }
    } catch (error) {
      errorHandler(error);
    }
  }

  function resetPlayback() {
    try {
      audioEngine.stop();
      audioScheduler.reset();
      playbackState.reset();
      statusDisplay.showStatus('Reset');
    } catch (error) {
      errorHandler(error);
    }
  }

  /**
   * Start the render loop (audio analysis + visual rendering)
   */
  function startAnimationLoop() {
    stopAnimationLoop();

    const animate = () => {
      if (playbackState.isPlaying) {
        const data = audioEngine.getAnalysisData();
        if (data) {
          audioAnalyzer.analyze(data.frequencyData, data.timeData, audioEngine.sampleRate);
        }
      }

      const currentTime = playbackState.getCurrentTime(audioEngine.audioContext);
      visualRenderer.render(audioAnalyzer.getValues(), currentTime);

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  function stopAnimationLoop() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  /**
   * Handle window resize
   */
  function handleResize() {
    visualRenderer.resizeCanvas();
  }

  function destroy() {
    stopAnimationLoop();
  }

  return {
    togglePlayback,
    resetPlayback,
    startAnimationLoop,
    stopAnimationLoop,
    handleResize,
    destroy,
  };
}
