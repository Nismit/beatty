# Beatty リファクタリング計画

完全に新規で作り直す。既存の完成品と同じ機能を持つことがゴール。

---

## 全体構成

```
src/
├── main.js                    - Facade（配線のみ、ロジックなし）
│
├── audio/
│   ├── AudioEngine.js         - Class: Web Audio API + Worklet
│   ├── AudioAnalyzer.js       - Class: 周波数解析
│   ├── AudioScheduler.js      - Factory: バッファ生成タイミング・blockOffset管理
│   └── audio-worklet.js
│
├── gl/
│   ├── SoundRenderer.js       - Class: Transform Feedback
│   ├── VisualRenderer.js      - Class: Fragment shader
│   ├── ShaderCompiler.js      - 純粋関数: コンパイル・検証・シェーダービルド
│   ├── shader-templates.js
│   └── gl-utils.js            - 純粋関数: バッファ作成・uniform設定
│
├── state/
│   ├── EventBus.js            - Factory: 汎用イベントバス
│   ├── PlaybackState.js       - Factory: 再生状態 + タイミング
│   └── AudioSettings.js       - Factory: BPM/Volume（永続化）
│
├── input/
│   ├── KeyboardController.js  - Factory: キーボードショートカット
│   ├── MobileController.js    - Factory: モバイルボタン + スライダー
│   └── ModalController.js     - Factory: ヘルプモーダル/ポップアップ
│
├── controllers/
│   ├── PlaybackController.js  - Factory: 再生制御（AnimationLoop含む）
│   ├── ShaderController.js    - Factory: ShaderCompilerへの委譲
│   └── UIController.js        - Factory: ボタン状態・DOM更新
│
├── editor/
│   └── Editor.js              - Class: CodeMirror GLSLエディタ
│
├── ui/
│   └── StatusDisplay.js       - Factory: DOM更新のみ
│
├── utils/
│   ├── consts.js              - 定数（EVENTS含む）
│   ├── errors.js              - エラークラス定義
│   └── storage.js             - 純粋関数: LocalStorage
│
├── index.html
├── styles.css
├── sw.js
└── manifest.json

tests/
├── setup.js                   - Vitest セットアップ
├── state/
│   ├── EventBus.test.js
│   ├── PlaybackState.test.js
│   └── AudioSettings.test.js
├── controllers/
│   └── ...
└── utils/
    └── storage.test.js
```

---

## Class vs Factory関数 の使い分け

### Class を使う場合

**条件:** 以下のいずれかに該当する場合

1. **外部APIのリソースを管理する** (WebGL, Web Audio API)
2. **プライベートフィールド `#` が必要**
3. **複雑な内部状態を持つ**

```js
// Class が適切な例
class SoundRenderer {
  #gl;
  #program;
  #bufferPool = new Map();

  constructor() {
    const canvas = document.createElement('canvas');
    this.#gl = canvas.getContext('webgl2');
  }

  #getPooledBuffer(size) { /* プライベートメソッド */ }

  compile(code) { /* パブリックAPI */ }
  destroy() { /* リソース解放 */ }
}
```

**該当モジュール:**
- `AudioEngine` - AudioContext, WorkletNode 管理
- `AudioAnalyzer` - RingBuffer, EMA状態管理
- `SoundRenderer` - WebGLリソース管理
- `VisualRenderer` - WebGLリソース管理
- `Editor` - CodeMirrorインスタンス管理

### Factory関数を使う場合

**条件:** 以下のいずれかに該当する場合

1. **軽量な状態管理**
2. **依存性の注入が主目的**
3. **テストしやすさを優先**

```js
// Factory関数が適切な例
export function createPlaybackState(eventBus) {
  const state = {
    isPlaying: false,
    isPaused: false,
    blockOffset: 0,
  };

  return {
    get isPlaying() { return state.isPlaying; },

    setPlaying(playing, paused = false) {
      state.isPlaying = playing;
      state.isPaused = paused;
      eventBus.emit(EVENTS.PLAY_STATE_CHANGED, { isPlaying: playing, isPaused: paused });
    },

    destroy() { /* クリーンアップ */ }
  };
}
```

**該当モジュール:**
- `EventBus` - Map + on/emit/off
- `PlaybackState` - 再生状態
- `AudioSettings` - BPM/Volume
- `AudioScheduler` - タイミング制御
- `StatusDisplay` - DOM更新
- 全ての `Controller` - 依存性の注入が主目的
- 全ての `input/` - イベントリスナー管理

### 純粋関数を使う場合

**条件:** 状態を持たない、入力→出力の変換のみ

```js
// 純粋関数が適切な例
export function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new ShaderCompileError(error, type);
  }

  return shader;
}
```

**該当モジュール:**
- `ShaderCompiler.js` - compile, buildSoundShader, buildVisualShader
- `gl-utils.js` - createBuffer, setUniform, deleteResource
- `storage.js` - saveShader, loadShader, saveSettings, loadSettings
- `consts.js` - 定数エクスポートのみ

---

## 依存関係のルール

### 依存の方向（下から上へ一方向）

```
Layer 0: utils/
    ↑   (consts, errors, storage - 依存なし)
    │
Layer 1: state/
    ↑   (EventBus, PlaybackState, AudioSettings)
    │   依存: utils/ のみ
    │
Layer 2: gl/, audio/, editor/, ui/
    ↑   (SoundRenderer, AudioEngine, Editor, StatusDisplay)
    │   依存: utils/, state/ のみ
    │
Layer 3: controllers/, input/
    ↑   (PlaybackController, KeyboardController, etc.)
    │   依存: Layer 0-2
    │
Layer 4: main.js
        (Facade - 全てを接続)
```

### 循環参照を防ぐルール

1. **下位レイヤーは上位レイヤーを import しない**
2. **同一レイヤー内での相互参照は避ける**
3. **コールバック/イベントで逆方向の通信を行う**

```js
// NG: AudioScheduler が PlaybackController を直接参照
import { playbackController } from '../controllers/PlaybackController.js';

// OK: コールバックで通信
export function createAudioScheduler({ onBufferReady }) {
  // バッファ生成完了時にコールバック
  onBufferReady(buffer);
}
```

### AudioScheduler のインターフェース設計

**問題:** AudioScheduler が SoundRenderer を直接使うと Audio層とGL層が密結合になる

**解決:** 関数を注入し、依存を逆転

```js
// audio/AudioScheduler.js
export function createAudioScheduler({
  generateBuffer,   // (blockOffset) => Promise<Float32Array>
  playbackState,
  audioSettings,
  eventBus,
}) {
  let currentBlockOffset = 0;

  function getSecondsPerBar() {
    return 60.0 / audioSettings.bpm * 4;
  }

  async function requestNextBuffer() {
    const nextOffset = currentBlockOffset + getSecondsPerBar();
    currentBlockOffset = nextOffset;

    const buffer = await generateBuffer(nextOffset);
    eventBus.emit(EVENTS.BUFFER_READY, buffer);
    return buffer;
  }

  function reset() {
    currentBlockOffset = 0;
  }

  return { requestNextBuffer, reset, destroy: reset };
}

// main.js での接続
const audioScheduler = createAudioScheduler({
  generateBuffer: (blockOffset) => soundRenderer.generateAudioBuffer(
    blockOffset,
    audioSettings.bpm,
    audioSettings.sampleRate
  ),
  playbackState,
  audioSettings,
  eventBus,
});
```

---

## イベント定義

```js
// utils/consts.js
export const EVENTS = {
  // Playback
  PLAY_STATE_CHANGED: 'playback:stateChanged',
  PLAYBACK_RESET: 'playback:reset',

  // Audio Settings
  BPM_CHANGED: 'settings:bpmChanged',
  VOLUME_CHANGED: 'settings:volumeChanged',

  // Audio Buffer
  BUFFER_READY: 'audio:bufferReady',
  BUFFER_REQUESTED: 'audio:bufferRequested',

  // Shader
  SHADER_COMPILE_START: 'shader:compileStart',
  SHADER_COMPILE_SUCCESS: 'shader:compileSuccess',
  SHADER_COMPILE_ERROR: 'shader:compileError',
  SHADER_APPLIED: 'shader:applied',

  // Editor
  EDITOR_MODE_CHANGED: 'editor:modeChanged',
  EDITOR_VISIBILITY_CHANGED: 'editor:visibilityChanged',

  // UI
  STATUS_UPDATE: 'ui:statusUpdate',
};
```

---

## エラーハンドリング

### エラークラス定義

```js
// utils/errors.js
export class BeattyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BeattyError';
  }
}

export class ShaderCompileError extends BeattyError {
  constructor(message, shaderType, lineNumber = null) {
    super(message);
    this.name = 'ShaderCompileError';
    this.shaderType = shaderType; // 'sound' | 'visual'
    this.lineNumber = lineNumber;
  }
}

export class AudioContextError extends BeattyError {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'AudioContextError';
    this.originalError = originalError;
  }
}

export class WebGLError extends BeattyError {
  constructor(message) {
    super(message);
    this.name = 'WebGLError';
  }
}
```

### エラーハンドラ

```js
// utils/errors.js
export function createErrorHandler(statusDisplay) {
  return function handleError(error) {
    console.error(error);

    if (error instanceof ShaderCompileError) {
      const line = error.lineNumber ? ` (line ${error.lineNumber})` : '';
      statusDisplay.showError(`Shader Error${line}: ${error.message}`);
    } else if (error instanceof AudioContextError) {
      statusDisplay.showError(`Audio Error: ${error.message}`);
    } else if (error instanceof WebGLError) {
      statusDisplay.showError(`WebGL Error: ${error.message}`);
    } else {
      statusDisplay.showError(`Error: ${error.message}`);
    }
  };
}
```

### 使用例

```js
// controllers/ShaderController.js
export function createShaderController({ soundRenderer, visualRenderer, editor, errorHandler }) {
  function compileShader() {
    try {
      const code = editor.getCurrentCode();
      if (editor.mode === 'sound') {
        soundRenderer.compile(code);
      } else {
        visualRenderer.compile(code);
      }
    } catch (error) {
      errorHandler(error);
    }
  }

  return { compileShader };
}
```

---

## テスト戦略 (Vitest)

### セットアップ

```js
// vitest.config.js
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
      exclude: ['src/audio/audio-worklet.js'], // Worker は別環境
    },
  },
});
```

```js
// tests/setup.js
import { vi } from 'vitest';

// WebGL モック
class WebGL2RenderingContextMock {
  createShader() { return {}; }
  shaderSource() {}
  compileShader() {}
  getShaderParameter() { return true; }
  // ... 必要なメソッドを追加
}

// Canvas モック
HTMLCanvasElement.prototype.getContext = function(type) {
  if (type === 'webgl2') {
    return new WebGL2RenderingContextMock();
  }
  return null;
};

// AudioContext モック
global.AudioContext = vi.fn().mockImplementation(() => ({
  createAnalyser: vi.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
  })),
  createGain: vi.fn(() => ({ connect: vi.fn(), gain: { value: 1 } })),
  destination: {},
  sampleRate: 48000,
  currentTime: 0,
  state: 'running',
  resume: vi.fn().mockResolvedValue(),
  close: vi.fn().mockResolvedValue(),
}));
```

### テストの分類

| 種類 | 対象 | 特徴 |
|------|------|------|
| Unit | Factory関数, 純粋関数 | モック不要、高速 |
| Integration | Controllers | 依存をモック |
| E2E | 全体 | Playwright (将来) |

### テスト例

```js
// tests/state/EventBus.test.js
import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from '../../src/state/EventBus.js';

describe('EventBus', () => {
  it('should emit events to subscribers', () => {
    const eventBus = createEventBus();
    const callback = vi.fn();

    eventBus.on('test', callback);
    eventBus.emit('test', { value: 42 });

    expect(callback).toHaveBeenCalledWith({ value: 42 });
  });

  it('should remove listener with off()', () => {
    const eventBus = createEventBus();
    const callback = vi.fn();

    eventBus.on('test', callback);
    eventBus.off('test', callback);
    eventBus.emit('test', {});

    expect(callback).not.toHaveBeenCalled();
  });

  it('should clear all listeners on destroy()', () => {
    const eventBus = createEventBus();
    const callback = vi.fn();

    eventBus.on('test', callback);
    eventBus.destroy();
    eventBus.emit('test', {});

    expect(callback).not.toHaveBeenCalled();
  });
});
```

```js
// tests/state/PlaybackState.test.js
import { describe, it, expect, vi } from 'vitest';
import { createPlaybackState } from '../../src/state/PlaybackState.js';
import { EVENTS } from '../../src/utils/consts.js';

describe('PlaybackState', () => {
  it('should emit event when play state changes', () => {
    const mockEventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
    const playbackState = createPlaybackState(mockEventBus);

    playbackState.setPlaying(true);

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      EVENTS.PLAY_STATE_CHANGED,
      { isPlaying: true, isPaused: false }
    );
  });

  it('should reset timing state', () => {
    const mockEventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
    const playbackState = createPlaybackState(mockEventBus);

    playbackState.setPlaying(true);
    playbackState.reset();

    expect(playbackState.isPlaying).toBe(false);
    expect(playbackState.blockOffset).toBe(0);
  });
});
```

```js
// tests/utils/storage.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { saveShader, loadShader, saveSettings, loadSettings } from '../../src/utils/storage.js';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveShader / loadShader', () => {
    it('should save and load shader code', () => {
      const code = 'vec2 mainSound(float t) { return vec2(0.0); }';

      saveShader('sound', code);
      const loaded = loadShader('sound');

      expect(loaded).toBe(code);
    });

    it('should return null for non-existent shader', () => {
      expect(loadShader('sound')).toBeNull();
    });
  });

  describe('saveSettings / loadSettings', () => {
    it('should save and load settings', () => {
      saveSettings({ bpm: 140, volume: 0.5 });
      const loaded = loadSettings();

      expect(loaded.bpm).toBe(140);
      expect(loaded.volume).toBe(0.5);
    });
  });
});
```

### テストカバレッジ目標

| モジュール | 目標 |
|-----------|------|
| utils/ | 90%+ |
| state/ | 90%+ |
| controllers/ | 80%+ |
| gl/, audio/ | 60%+ (モック依存) |
| editor/ | 50%+ (CodeMirror依存) |

---

## consts.js 完全版

```js
// utils/consts.js
export const APP = {
  STATUS_UPDATE_INTERVAL: 100,
};

export const AUDIO = {
  SAMPLE_RATE: 48000,
  DEFAULT_BPM: 120,
  DEFAULT_VOLUME: 0.3,
  FFT_SIZE: 2048,
  SMOOTHING_TIME_CONSTANT: 0.6,
  MIN_DECIBELS: -80,
  MAX_DECIBELS: -20,
  SAMPLES_PER_BAR_MULTIPLIER: 240,
  STEREO: 2,
  BYTES_PER_SAMPLE: 4,
};

export const ANALYSIS = {
  EMA_ALPHA: 0.3,
  PEAK_DECAY: 0.95,
  ONSET_THRESHOLD: 0.15,
  NORM_DECAY: 0.999,
  RING_BUFFER_SIZE: 8,
  MIN_MAX_VALUE: 0.001,
  HISTORY_LENGTH: 5,
  WEIGHT: {
    BAND: 0.6,
    PEAK: 0.4,
    ENERGY: 0.7,
    RMS: 0.3,
  },
  DEFAULT_FREQ_RANGES: {
    KICK: [20, 80],
    HIHAT: [5000, 12000],
    BASS: [100, 300],
  },
};

export const WEBGL = {
  TRANSFORM_FEEDBACK_VARYINGS: ['v_audioSample'],
  CLEAR_COLOR: [0.0, 0.0, 0.0, 1.0],
};

export const UI = {
  EDITOR_MODES: {
    SOUND: 'sound',
    VISUAL: 'visual',
  },
  STATUS_TYPES: {
    READY: 'ready',
    ERROR: 'error',
    SUCCESS: 'success',
    COMPILING: 'compiling',
  },
};

export const STORAGE_KEYS = {
  SOUND_SHADER: 'beatty_sound_shader',
  VISUAL_SHADER: 'beatty_visual_shader',
  SETTINGS: 'beatty_settings',
};

export const EVENTS = {
  // Playback
  PLAY_STATE_CHANGED: 'playback:stateChanged',
  PLAYBACK_RESET: 'playback:reset',

  // Audio Settings
  BPM_CHANGED: 'settings:bpmChanged',
  VOLUME_CHANGED: 'settings:volumeChanged',

  // Audio Buffer
  BUFFER_READY: 'audio:bufferReady',
  BUFFER_REQUESTED: 'audio:bufferRequested',

  // Shader
  SHADER_COMPILE_START: 'shader:compileStart',
  SHADER_COMPILE_SUCCESS: 'shader:compileSuccess',
  SHADER_COMPILE_ERROR: 'shader:compileError',
  SHADER_APPLIED: 'shader:applied',

  // Editor
  EDITOR_MODE_CHANGED: 'editor:modeChanged',
  EDITOR_VISIBILITY_CHANGED: 'editor:visibilityChanged',

  // UI
  STATUS_UPDATE: 'ui:statusUpdate',
};
```

---

## 実装順序

### Phase 1: 基盤 ✅ 完了
1. ✅ `utils/consts.js` - 定数定義 + EVENTS
2. ✅ `utils/errors.js` - エラークラス
3. ✅ `utils/storage.js` - LocalStorage操作（キーを `beatty_` に変更）
4. ✅ `state/EventBus.js` - 汎用イベントバス

### Phase 2: State
5. `state/PlaybackState.js` - 再生状態 + タイミング
6. `state/AudioSettings.js` - BPM/Volume（永続化）

### Phase 3: Audio
7. `audio/audio-worklet.js` - AudioWorkletProcessor
8. `audio/AudioEngine.js` - Web Audio API
9. `audio/AudioAnalyzer.js` - 周波数解析
10. `audio/AudioScheduler.js` - タイミング制御

### Phase 4: GL
11. `gl/gl-utils.js` - WebGLユーティリティ
12. `gl/ShaderCompiler.js` - コンパイル・検証
13. `gl/shader-templates.js` - デフォルトシェーダー
14. `gl/SoundRenderer.js` - Transform Feedback
15. `gl/VisualRenderer.js` - Fragment shader

### Phase 5: Editor
16. `editor/Editor.js` - CodeMirror GLSLエディタ

### Phase 6: UI
17. `ui/StatusDisplay.js` - ステータス表示

### Phase 7: Controllers
18. `controllers/PlaybackController.js` - 再生制御 + resize ハンドリング
19. `controllers/ShaderController.js` - シェーダー制御
20. `controllers/UIController.js` - UI制御

### Phase 8: Input
21. `input/KeyboardController.js` - キーボード
22. `input/MobileController.js` - モバイル
23. `input/ModalController.js` - モーダル

### Phase 9: 統合
24. `main.js` - Facade + エラーハンドラ接続 + beforeunload
25. `index.html` - HTML
26. `styles.css` - スタイル
27. `sw.js` - Service Worker

### Phase 10: テスト
28. Vitest セットアップ
29. state/ テスト
30. utils/ テスト
31. controllers/ テスト

---

## 核心となる機能（既存から引き継ぐ）

- **Transform Feedback によるGPUオーディオ生成**
- **AudioWorklet によるリアルタイム再生**
- **周波数解析（Ring Buffer + EMA + Spectral Flux）**
- **CodeMirror 6 GLSLエディタ**
- **Sound/Visual モード切替**
- **キーボードショートカット**
- **モバイル対応**
- **PWA（Service Worker）**
- **LocalStorage による設定・シェーダー永続化**

---

## 技術スタック

- WebGL2 (Transform Feedback)
- Web Audio API + AudioWorklet
- ES6 Modules (ビルドツールなし、esm.sh経由)
- CodeMirror 6
- PWA (Service Worker)
- Vitest (テスト)
- Biome (Linter + Formatter)

---

## 設計上の決定事項

1. **Class vs Factory関数** - リソース管理が必要なものはClass、それ以外はFactory関数
2. **GLContext.js は作らない** - SoundRenderer と VisualRenderer は独立したコンテキストを使用
3. **UIState.js は作らない** - UI状態は各コンポーネントが管理
4. **AudioAnalyzer は外部から注入** - テスタビリティ向上
5. **Storage キーは `beatty_` プレフィックス** - プロジェクト名に合わせる
6. **全モジュールに destroy() 実装** - リソースリーク防止
7. **Audio → GL の順で実装** - AudioScheduler のインターフェースを先に確定
8. **依存は下から上へ一方向** - 循環参照を防止
9. **イベント名は EVENTS 定数を使用** - タイポ防止、補完有効化
10. **エラーは専用クラスで分類** - 一貫したエラーハンドリング
