# Beatty

A real-time audio generation and visualization application using WebGL shaders.

## Overview

Beatty is a web-based audio visualizer that runs in your browser. It uses GLSL shaders to generate audio in real-time while simultaneously rendering visual effects. Both sound and visual shaders are editable, providing a live coding experience.

## Features

- **Real-time Audio Generation**: Synthesize audio using WebGL shaders
- **Audio Visualizer**: Real-time visual effects synchronized with audio
- **Live Coding**: Edit shader code and see results in real-time
- **Dual Mode**: Switch between sound shader and visual shader editing
- **Audio Analysis**: Frequency analysis for kick, hihat, bass, and more
- **Mobile Support**: Touch device controls
- **Shader Persistence**: Save your shaders to browser local storage

## Usage

### Controls

1. **Play/Pause**: `⌘P` (Ctrl+P) to start/pause audio playback
2. **Reset**: `⌘I` (Ctrl+I) to reset playback position
3. **Compile**: `⌘S` (Ctrl+S) to compile shader code
4. **Apply**: `⌘R` (Ctrl+R) to apply compiled shader
5. **Toggle Editor**: `⌘T` (Ctrl+T) to show/hide editor
6. **Switch Mode**: `⌘E` (Ctrl+E) to switch between sound/visual mode

### Mobile Controls

Use the buttons at the top of the screen:
- ▶/⏸: Play/Pause
- ⏹: Reset  
- 🔧: Compile
- ✓: Apply
- 📝: Toggle Editor
- 🔄: Switch Mode
- ?: Help

### Parameter Adjustment

- **BPM**: Click on the BPM display in the status bar to adjust tempo
- **Volume**: Click on the VOL display in the status bar to adjust volume

## Shader Programming

### Sound Shader

Sound shaders implement the `vec2 mainSound(float time)` function:

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

### Visual Shader

Visual shaders implement the `vec3 mainImage(vec2 fragCoord)` function:

```glsl
vec3 mainImage(vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Use audio data for visual effects
    float kick = u_kick;
    float bass = u_bass;
    
    vec3 color = vec3(uv, 0.5 + 0.5 * sin(u_time));
    color *= 1.0 + kick * 2.0;
    
    return color;
}
```

### Available Uniforms

#### Sound Shader
- `u_time`: Elapsed time (seconds)
- `u_bpm`: Current BPM
- `u_sampleRate`: Sample rate

#### Visual Shader
- `u_time`: Elapsed time (seconds)
- `u_resolution`: Screen resolution
- `u_kick`, `u_hihat`, `u_bass`: Audio analysis values
- `u_volume`: Current volume

## Browser Requirements

- WebGL2 support
- Web Audio API support
- AudioWorklet support
- ES6 Modules support

## Getting Started

1. Serve the files via HTTP server (required due to CORS restrictions)
2. Open `src/index.html` in your browser
3. Start coding shaders and enjoy live audio-visual programming!

## License

MIT License

## Contributing

Bug reports and feature requests are welcome via GitHub Issues. Pull requests are also appreciated.
