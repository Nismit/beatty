現在のコードベースを詳しく読みました。既に良くできていますが、ゼロから作り直すなら以下のような構成を提案します。

---

## 大きな方針の変更点

### 1. State を細分化する

現在の `AppState` が再生状態・UI状態・設定値・タイミング情報をすべて持っていて責務が大きすぎます。

```
state/
├── EventBus.js            - 汎用イベントバス（AppStateから分離）
├── PlaybackState.js       - 再生状態 (isPlaying, isPaused, blockOffset, elapsed)
├── AudioSettings.js       - BPM, Volume, sampleRate（永続化対象）
└── UIState.js             - isCompiled, pendingApply, editorMode, editorVisible
```

`EventBus` を独立させることで、各 State モジュールが自身のイベントだけを管理し、テストも容易になります。

### 2. InputHandler を分割する

現在315行で keyboard / mobile / modal / slider を全部担当しています。

```
input/
├── KeyboardController.js  - キーボードショートカット
├── MobileController.js    - モバイルボタン + スライダー
└── ModalController.js     - ヘルプモーダル/ポップアップ
```

### 3. Audio 生成のコールバックチェーンを整理する

現在 `main.js` の `setupCallbacks()` で `audio.generateBufferCallback` にタイミング計算の副作用が埋まっています。これを明示的なクラスに切り出します。

```
audio/
├── AudioEngine.js         - Web Audio API + Worklet (現Audio.js)
├── AudioAnalyzer.js       - 周波数解析（現状維持、完成度が高い）
├── AudioScheduler.js      - ★新規: blockOffset管理、バッファ生成タイミング制御
└── audio-worklet.js       - AudioWorkletProcessor
```

`AudioScheduler` が `AudioEngine` と `SoundGL` の仲介役になり、タイミングロジックが一箇所に集約されます。

### 4. GL レイヤーに Lifecycle を導入する

```
gl/
├── GLContext.js            - ★新規: WebGL2コンテキスト管理・共通リソース
├── SoundRenderer.js        - Transform Feedback (現SoundGL)
├── VisualRenderer.js       - Fragment shader (現VisualGL)
├── ShaderCompiler.js       - ★新規: コンパイル・検証・エラー整形を分離
├── shader-templates.js
└── gl-utils.js
```

現在 `SoundGL` と `VisualGL` が各自でコンパイル・リソース管理・レンダリングを全部やっています。`ShaderCompiler` を分離すれば `ShaderController` が薄くなり、コンパイルエラーのハンドリングも統一できます。

### 5. Controllers はそのまま薄く保つ

```
controllers/
├── PlaybackController.js   - 再生制御（AnimationLoop含む）
├── ShaderController.js     - ShaderCompilerへの委譲のみ
└── UIController.js         - ボタン状態・DOM更新
```

入力系は `input/` に移動したので、Controllers は純粋な「コマンド実行」だけに集中します。

### 6. consts.js のマジックナンバー集約

現在 `AudioAnalyzer` に散在する `emaAlpha: 0.3`、`peakDecay: 0.95`、`SoundGL` の `Float32Array.BYTES_PER_ELEMENT` 計算などを明示的に定数化します。

```js
// consts.js
export const AUDIO = {
  SAMPLE_RATE: 48000,
  STEREO: 2,
  BYTES_PER_SAMPLE: Float32Array.BYTES_PER_ELEMENT,
};

export const ANALYSIS = {
  EMA_ALPHA: 0.3,
  PEAK_DECAY: 0.95,
  ONSET_THRESHOLD: 1.5,
  RING_BUFFER_SIZE: 8,
};
```

---

## 全体構成まとめ

```
src/
├── main.js                    - Facade（配線のみ、ロジックなし）
│
├── audio/
│   ├── AudioEngine.js         - Web Audio API + Worklet
│   ├── AudioAnalyzer.js       - 周波数解析（ほぼ現状維持）
│   ├── AudioScheduler.js      - バッファ生成タイミング・blockOffset管理
│   └── audio-worklet.js
│
├── gl/
│   ├── GLContext.js            - WebGL2コンテキスト共通管理
│   ├── SoundRenderer.js        - Transform Feedback
│   ├── VisualRenderer.js       - Fragment shader
│   ├── ShaderCompiler.js       - コンパイル・検証
│   ├── shader-templates.js
│   └── gl-utils.js
│
├── state/
│   ├── EventBus.js             - 汎用イベントバス
│   ├── PlaybackState.js        - 再生状態
│   ├── AudioSettings.js        - BPM/Volume（永続化）
│   └── UIState.js              - UI状態
│
├── input/
│   ├── KeyboardController.js
│   ├── MobileController.js
│   └── ModalController.js
│
├── controllers/
│   ├── PlaybackController.js
│   ├── ShaderController.js
│   └── UIController.js
│
├── editor/
│   └── Editor.js               - CodeMirror（現状維持）
│
├── ui/
│   └── StatusDisplay.js        - DOM更新のみ（現StatusManager）
│
├── utils/
│   ├── consts.js               - 定数（マジックナンバー集約）
│   └── storage.js              - LocalStorage
│
├── index.html
├── styles.css
├── sw.js
└── manifest.json
```

---

## 変えないもの

- **ビルドツールなし + esm.sh CDN** — このプロジェクトの大きな利点なので維持
- **AudioAnalyzer** — Ring Buffer + EMA + Spectral Flux の実装は完成度が高い
- **Editor.js** — CodeMirror のラッパーとして十分
- **Transform Feedback によるGPUオーディオ生成** — 核心のアーキテクチャ

## 最も効果の大きい変更 3つ

1. **`AudioScheduler` の導入** — タイミング副作用がコールバックに散在する問題を解消
2. **`EventBus` の分離 + State 細分化** — テスタビリティと見通しが大幅に改善
3. **`InputHandler` の3分割** — 315行のモノリスを責務ごとに分離
