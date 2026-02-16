import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
      exclude: [
        // Audio: Web Audio API / AudioWorklet requires real browser environment
        'src/audio/audio-worklet.js',
        'src/audio/AudioEngine.js',
        'src/audio/AudioScheduler.js',
        'src/audio/AudioAnalyzer.js',
        // GL: WebGL2 / Transform Feedback requires real GPU context
        'src/gl/SoundRenderer.js',
        'src/gl/VisualRenderer.js',
        'src/gl/gl-utils.js',
        'src/gl/ShaderCompiler.js',
        'src/gl/shader-templates.js', // Constants only, no logic
        // UI: Heavy DOM manipulation, better suited for E2E tests
        'src/ui/StatusDisplay.js',
        'src/ui/PresetModal.js',
        // Editor: CodeMirror 6 integration, external library dependency
        'src/editor/Editor.js',
        // Input: Mobile touch events, better suited for E2E tests
        'src/input/MobileController.js',
        // Other: Entry points and constants
        'src/main.js', // App orchestration, integration test candidate
        'src/sw.js', // Service Worker, runs in separate context
        'src/utils/consts.js', // Constants only, no logic
      ],
    },
  },
});
