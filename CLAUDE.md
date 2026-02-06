# Beatty

WebGLシェーダーによるリアルタイムオーディオ生成・ビジュアライゼーションアプリ。ブラウザ上でGLSLシェーダーを使ってオーディオを合成し、同時にビジュアルエフェクトをレンダリングするPWA。

## 技術スタック

- WebGL2 (Transform Feedback でオーディオ生成)
- Web Audio API + AudioWorklet
- ES6 Modules (ビルドツールなし、esm.sh経由で外部ライブラリ読み込み)
- CodeMirror 6 (GLSLエディタ)
- PWA (Service Worker)

## アーキテクチャ

```
main.js (AudioVisualizerSystem)
├── AppState.js       - 状態管理 (BPM, Volume, 再生状態, イベントシステム)
├── StatusManager.js  - UI状態表示
├── SoundGL.js        - サウンドシェーダー処理 (WebGL2 Transform Feedback)
├── VisualGL.js       - ビジュアルシェーダー処理
├── audio.js          - Web Audio API, AudioWorklet管理
│   └── audio-analyzer.js - 周波数解析 (kick/hihat/bass)
├── editor.js         - CodeMirror 6 GLSLエディタ
└── storage.js        - LocalStorage永続化
```

## ディレクトリ構成

```
src/
├── index.html        - エントリポイント
├── main.js           - AudioVisualizerSystem (メインクラス)
├── AppState.js       - アプリ状態管理
├── SoundGL.js        - サウンドシェーダー (Transform Feedback)
├── VisualGL.js       - ビジュアルシェーダー
├── audio.js          - オーディオシステム
├── audio-analyzer.js - 周波数解析
├── audio-worklet.js  - AudioWorkletProcessor
├── editor.js         - CodeMirror 6 GLSLエディタ
├── StatusManager.js  - ステータス表示
├── consts.js         - 定数定義
├── utils.js          - WebGLユーティリティ関数
├── storage.js        - LocalStorage操作
├── shader-templates.js - デフォルトシェーダーテンプレート
├── styles.css
└── manifest.json     - PWAマニフェスト
```

## 開発

HTTPサーバー経由で `src/index.html` を開く (CORS制限のため)

```bash
# 例: Python
python3 -m http.server 8080

# 例: npx
npx serve src
```

## シェーダーAPI

### サウンドシェーダー

`mainSound(float time)` を実装する。戻り値は `vec2` (ステレオ)

利用可能なUniform:
- `u_bpm` - BPM
- `u_sampleRate` - サンプルレート
- `u_blockOffset` - 現在のブロックオフセット

### ビジュアルシェーダー

`visualMain(vec2 uv, vec2 resolution)` を実装する。戻り値は `vec3` (RGB)

利用可能なUniform:
- `u_resolution` - 画面解像度
- `u_time` - 経過時間
- `u_kick` - キック (20-80Hz)
- `u_hihat` - ハイハット (5000-12000Hz)
- `u_bass` - ベース (100-300Hz)

## キーボードショートカット

- `Cmd/Ctrl + P` - 再生/一時停止
- `Cmd/Ctrl + I` - リセット
- `Cmd/Ctrl + S` - シェーダーコンパイル
- `Cmd/Ctrl + R` - コンパイル済みシェーダー適用
- `Cmd/Ctrl + T` - エディタ表示切替
- `Cmd/Ctrl + E` - Sound/Visualモード切替

## 主要クラス

### SoundGL
- `compile(userCode)` - シェーダーコンパイル
- `generateAudioBuffer(blockOffset, bpm, sampleRate)` - オーディオバッファ生成 (Promise)
- `applyCompiledShader()` - コンパイル済みシェーダー適用

### VisualGL
- `compile(visualCode)` - シェーダーコンパイル
- `render(audioAnalysisData, appState)` - 描画
- `applyCompiledShader()` - コンパイル済みシェーダー適用

### Audio
- `init()` - AudioContext, AudioWorklet初期化
- `start(volume)` / `pause()` / `resume()` / `stop()` - 再生制御
- `generateBufferCallback` - バッファ生成コールバック

### AppState
- イベント駆動型状態管理
- `on(event, callback)` / `emit(event, data)` でイベント購読/発行
- 主要イベント: `bpmChanged`, `volumeChanged`, `playStateChanged`
