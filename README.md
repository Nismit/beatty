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

Mac: `Ctrl + (key)` / Windows: `Ctrl + Shift + (key)`

| Key | Action |
|-----|--------|
| `P` | **P**lay / Pause |
| `I` | **I**nitialize (Reset playback) |
| `C` | **C**ompile shader |
| `A` | **A**pply compiled shader |
| `V` | **V**isibility (Toggle editor) |
| `M` | **M**ode (Switch Sound / Visual) |
| `D` | **D**ebug overlay |
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
    vec2 o = vec2(0.0);

    // Kick: every beat
    float kickTime = beatToTime(mod(beat, 1.0));
    o += vec2(kick(kickTime)) * 0.7;

    // Hihat: offbeat
    float hihatTime = beatToTime(mod(beat + 0.5, 1.0));
    o += vec2(hihat(hihatTime)) * 0.3;

    // Snare: beats 2 and 4
    float snareTime = beatToTime(mod(beat + 1.0, 2.0));
    o += vec2(snare(snareTime)) * 0.6;

    return o;
}
```

**Available Uniforms:**
- `u_bpm` - Current BPM
- `u_sampleRate` - Sample rate
- `u_blockOffset` - Current block offset

**Built-in Constants:**
- `PI` - 3.14159265359
- `TAU` - 6.28318530718

**Built-in Utility Functions:**
- `timeToBeat(time)` / `beatToTime(beat)` - Time/beat conversion
- `mtof(note)` - MIDI note to frequency (A4 = 69 = 440Hz)
- `quantize(beat, division)` - Quantize beat to grid
- `adsr(time, a, d, s, r, duration)` - ADSR envelope
- `lfo(time, rate)` - Low frequency oscillator

**Built-in Waveforms:**
- `sine(phase)`, `saw(phase)`, `square(phase)`, `triangle(phase)`
- `hash21(vec2)`, `hash22(vec2)` - High quality hash functions

**Built-in Instruments:**
- `kick(time)`, `hihat(time)`, `openHihat(time)`, `snare(time)`
- `clap(time)`, `rim(time)`, `tom(time, freq)`
- `bass(time, freq, cutoff)`, `subBass(time, freq)`
- `lead(time, freq)`, `pad(time, freq, duration)`
- `filteredSaw(phase, cutoff)` - Saw with cutoff control

**Built-in Effects:**
- `distort(x, drive)` - Soft clipping
- `lowpass(osc, cutoff)` - Simple lowpass filter
- `bitcrush(x, bits)` - Lo-fi effect
- `chorus(phase, depth, rate, time)` - Thicken sound

### Visual Shader

Implement `vec3 visualMain(vec2 uv, vec2 resolution)` returning RGB color:

```glsl
vec3 visualMain(vec2 uv, vec2 resolution) {
    vec2 pos = (uv - 0.5) * 2.0;
    pos.x *= resolution.x / resolution.y;

    // Circle with kick reaction
    float d = length(pos) - 0.3 - u_kickPeak * 0.1;
    float circle = smoothstep(0.02, 0.0, abs(d));

    vec3 color = hsv2rgb(vec3(u_time * 0.1, 0.8, circle));
    color += vec3(0.5, 0.7, 1.0) * u_kickOnset * 0.3;

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

**Built-in Constants:**
- `PI`, `TAU`

**Built-in Utility Functions:**
- `hsv2rgb(vec3 c)` - HSV to RGB conversion
- `rot2d(vec2 p, float a)` - 2D rotation
- `sdCircle(vec2 p, float r)` - Circle SDF
- `sdPolygon(vec2 p, float r, float n)` - N-sided polygon SDF

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
