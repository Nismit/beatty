/**
 * DebugOverlay factory function
 * Visualizes waveform, audio levels, and FFT spectrum for shader debugging
 */

const MODES = {
  WAVEFORM: 0,
  WAVEFORM_LEVELS: 1,
  WAVEFORM_LEVELS_SPECTRUM: 2,
};

const MODE_LABELS = ['Waveform', 'Waveform + Levels', 'Full'];

const COLORS = {
  WAVEFORM: '#4ecdc4',
  KICK: '#ff6b6b',
  HIHAT: '#ffd43b',
  BASS: '#51cf66',
  SPECTRUM: '#74c0fc',
  GRID: '#333',
  TEXT: '#888',
};

/**
 * @param {Object} deps
 * @param {import('../audio/AudioEngine.js').AudioEngine} deps.audioEngine
 * @param {import('../audio/AudioAnalyzer.js').AudioAnalyzer} deps.audioAnalyzer
 */
export function createDebugOverlay({ audioEngine, audioAnalyzer }) {
  let overlayEl = null;
  let canvas = null;
  let ctx = null;
  let labelEl = null;

  let isVisible = false;
  let currentMode = MODES.WAVEFORM;

  const CANVAS_WIDTH = 280;
  const CANVAS_HEIGHT = 180;
  const SPECTRUM_BARS = 64;

  function init() {
    overlayEl = document.getElementById('debugOverlay');
    canvas = document.getElementById('debugCanvas');
    labelEl = document.getElementById('debugModeLabel');

    if (!overlayEl || !canvas || !labelEl) {
      console.warn('[DebugOverlay] Required elements not found');
      return;
    }

    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    overlayEl.addEventListener('click', handleClick);
  }

  function handleClick(e) {
    e.stopPropagation();
    cycleMode();
  }

  function show() {
    if (!overlayEl) return;
    overlayEl.classList.add('visible');
    isVisible = true;
  }

  function hide() {
    if (!overlayEl) return;
    overlayEl.classList.remove('visible');
    isVisible = false;
  }

  function toggle() {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }

  function cycleMode() {
    currentMode = (currentMode + 1) % 3;
    if (labelEl) {
      labelEl.textContent = MODE_LABELS[currentMode];
    }
  }

  function update() {
    if (!isVisible || !ctx) return;

    const data = audioEngine.getAnalysisData();
    const values = audioAnalyzer.getValues();

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    drawGrid();

    // Always draw waveform
    if (data?.timeData) {
      drawWaveform(data.timeData);
    }

    // Draw levels in modes 1 and 2
    if (currentMode >= MODES.WAVEFORM_LEVELS) {
      drawLevels(values);
    }

    // Draw spectrum in mode 2
    if (currentMode === MODES.WAVEFORM_LEVELS_SPECTRUM && data?.frequencyData) {
      drawSpectrum(data.frequencyData);
    }
  }

  function drawGrid() {
    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
    ctx.stroke();

    // Vertical quarter lines
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((CANVAS_WIDTH * i) / 4, 0);
      ctx.lineTo((CANVAS_WIDTH * i) / 4, CANVAS_HEIGHT);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  function drawWaveform(timeData) {
    const waveformHeight = getWaveformHeight();
    const centerY = waveformHeight / 2;

    ctx.strokeStyle = COLORS.WAVEFORM;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const sliceWidth = CANVAS_WIDTH / timeData.length;
    let x = 0;

    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128.0 - 1.0;
      const y = centerY + v * centerY * 0.9;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();
  }

  function drawLevels(values) {
    const waveformHeight = getWaveformHeight();
    const levelsY = waveformHeight + 5;
    const barHeight = 20;
    const barWidth = 70;
    const gap = 10;
    const startX = 10;

    const bands = [
      {
        label: 'KICK',
        value: values.kick,
        peak: values.kickPeak,
        onset: values.kickOnset,
        color: COLORS.KICK,
      },
      {
        label: 'HIHAT',
        value: values.hihat,
        peak: values.hihatPeak,
        onset: values.hihatOnset,
        color: COLORS.HIHAT,
      },
      {
        label: 'BASS',
        value: values.bass,
        peak: values.bassPeak,
        onset: values.bassOnset,
        color: COLORS.BASS,
      },
    ];

    bands.forEach((band, i) => {
      const x = startX + i * (barWidth + gap);

      // Background
      ctx.fillStyle = '#222';
      ctx.fillRect(x, levelsY, barWidth, barHeight);

      // Value bar
      ctx.fillStyle = band.color;
      const valueWidth = band.value * barWidth;
      ctx.fillRect(x, levelsY, valueWidth, barHeight);

      // Peak indicator
      if (band.peak > 0.01) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const peakX = x + band.peak * barWidth - 2;
        ctx.fillRect(peakX, levelsY, 2, barHeight);
      }

      // Onset flash
      if (band.onset) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(x, levelsY, barWidth, barHeight);
      }

      // Label
      ctx.fillStyle = COLORS.TEXT;
      ctx.font = '9px monospace';
      ctx.fillText(band.label, x, levelsY + barHeight + 10);
    });
  }

  function drawSpectrum(frequencyData) {
    const waveformHeight = getWaveformHeight();
    const levelsHeight = 35;
    const spectrumY = waveformHeight + levelsHeight + 5;
    const spectrumHeight = CANVAS_HEIGHT - spectrumY - 5;
    const barWidth = (CANVAS_WIDTH - 20) / SPECTRUM_BARS;
    const startX = 10;

    // Downsample frequency data to SPECTRUM_BARS
    const binSize = Math.floor(frequencyData.length / SPECTRUM_BARS);

    for (let i = 0; i < SPECTRUM_BARS; i++) {
      // Average bins
      let sum = 0;
      for (let j = 0; j < binSize; j++) {
        sum += frequencyData[i * binSize + j];
      }
      const value = sum / binSize / 255;

      const x = startX + i * barWidth;
      const h = value * spectrumHeight;

      // Gradient color based on frequency
      const hue = 200 + (i / SPECTRUM_BARS) * 60;
      ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
      ctx.fillRect(x, spectrumY + spectrumHeight - h, barWidth - 1, h);
    }
  }

  function getWaveformHeight() {
    switch (currentMode) {
      case MODES.WAVEFORM:
        return CANVAS_HEIGHT;
      case MODES.WAVEFORM_LEVELS:
        return CANVAS_HEIGHT - 40;
      case MODES.WAVEFORM_LEVELS_SPECTRUM:
        return 70;
      default:
        return CANVAS_HEIGHT;
    }
  }

  function destroy() {
    if (overlayEl) {
      overlayEl.removeEventListener('click', handleClick);
    }
    overlayEl = null;
    canvas = null;
    ctx = null;
    labelEl = null;
  }

  return {
    init,
    show,
    hide,
    toggle,
    cycleMode,
    update,
    destroy,
  };
}
