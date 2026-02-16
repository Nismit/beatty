# Beatty

A real-time audio generation and visualization PWA using WebGL shaders.

## Overview

Beatty is a browser-based audio synthesizer and visualizer. It uses GLSL shaders with WebGL2 Transform Feedback to generate audio in real-time while simultaneously rendering visual effects. Both sound and visual shaders are editable via a built-in CodeMirror editor, providing a live coding experience.

## Features

- **Real-time Audio Generation**: Synthesize audio using WebGL2 Transform Feedback
- **Audio Visualizer**: Real-time visual effects synchronized with audio
- **Live Coding**: Edit shader code with syntax highlighting (CodeMirror 6)
- **Dual Mode**: Switch between sound shader and visual shader editing
- **Audio Analysis**: Frequency analysis for kick, hihat, bass with onset detection
- **Preset System**: Save, load, import/export shader presets
- **Mobile Support**: Touch device controls
- **PWA**: Installable as a Progressive Web App

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl + P` | Play / Pause |
| `Ctrl + I` | Reset playback |
| `Ctrl + S` | Compile shader |
| `Ctrl + R` | Apply compiled shader |
| `Ctrl + T` | Toggle editor visibility |
| `Ctrl + E` | Switch Sound / Visual mode |
| `Ctrl + G` | Open preset manager |
| `Escape` | Close modal |

## Mobile Controls

Buttons at the top of the screen:
- Play/Pause, Reset, Compile, Apply, Toggle Editor, Switch Mode, Presets, Help

## Parameter Adjustment

- **BPM**: Click on the BPM display in the status bar
- **Volume**: Click on the VOL display in the status bar

## Shader Programming

### Sound Shader

Implement `vec2 mainSound(float time)` returning stereo audio samples:

```glsl
vec2 mainSound(float time) {
    float beat = timeToBeat(time);

    // Kick drum
    float kick = exp(-fract(beat) * 8.0) * sin(beat * 6.28);

    // Hi-hat
    float hihat = exp(-fract(beat * 4.0) * 12.0) * noise(beat * 1000.0);

    // Bass
    float bass = sin(beat * 3.14159) * 0.3;

    return vec2(kick + hihat + bass);
}
```

**Available Uniforms:**
- `u_bpm` - Current BPM
- `u_sampleRate` - Sample rate
- `u_blockOffset` - Current block offset

### Visual Shader

Implement `vec3 visualMain(vec2 uv, vec2 resolution)` returning RGB color:

```glsl
vec3 visualMain(vec2 uv, vec2 resolution) {
    vec2 p = (uv - 0.5 * resolution) / resolution.y;

    // Use audio data for visual effects
    float kick = u_kick;
    float bass = u_bass;

    vec3 color = vec3(p, 0.5 + 0.5 * sin(u_time));
    color *= 1.0 + kick * 2.0;

    return color;
}
```

**Available Uniforms:**

| Uniform | Description |
|---------|-------------|
| `u_resolution` | Screen resolution |
| `u_time` | Elapsed time (seconds) |
| `u_kick` | Kick level (20-80Hz, smoothed, 0-1) |
| `u_hihat` | Hihat level (5000-12000Hz, smoothed, 0-1) |
| `u_bass` | Bass level (100-300Hz, smoothed, 0-1) |
| `u_kickPeak` | Kick peak (decaying, for flash effects) |
| `u_hihatPeak` | Hihat peak (decaying) |
| `u_bassPeak` | Bass peak (decaying) |
| `u_kickOnset` | Kick onset detection (1.0 or 0.0) |
| `u_hihatOnset` | Hihat onset detection (1.0 or 0.0) |
| `u_bassOnset` | Bass onset detection (1.0 or 0.0) |

## Browser Requirements

- WebGL2 support
- Web Audio API with AudioWorklet
- ES6 Modules support

## Getting Started

1. Serve the files via HTTP server (required for ES modules and AudioWorklet):
   ```bash
   # Python
   python3 -m http.server 8080

   # or npx
   npx serve src
   ```

2. Open `http://localhost:8080` in your browser

3. Press `Ctrl + P` to start playback

4. Edit shaders, press `Ctrl + S` to compile, `Ctrl + R` to apply

## Development

```bash
npm run lint        # Biome lint check
npm run lint:fix    # Auto fix
npm run format      # Format code
npm run test        # Run tests
```

## License

MIT License
