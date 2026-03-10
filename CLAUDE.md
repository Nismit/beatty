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
main.js (ファサード - 全コンポーネントの配線、ロジックなし)
├── state/                    - 状態管理層
│   ├── EventBus              - イベント駆動型通信
│   ├── PlaybackState         - 再生状態 (時間、再生中フラグ)
│   └── AudioSettings         - 音声設定 (BPM, Volume, SampleRate)
├── audio/                    - オーディオ処理層
│   ├── AudioEngine           - Web Audio API, AudioWorklet管理
│   ├── AudioAnalyzer         - 周波数解析 (kick/hihat/bass)
│   └── AudioScheduler        - バッファスケジューリング
├── gl/                       - WebGL/シェーダー層
│   ├── SoundRenderer         - サウンドシェーダー (Transform Feedback)
│   ├── VisualRenderer        - ビジュアルシェーダー
│   └── ShaderCompiler        - シェーダービルド/コンパイル (純粋関数)
├── controllers/              - コントローラー層
│   ├── PlaybackController    - 再生/一時停止/リセット
│   ├── ShaderController      - シェーダーコンパイル/適用
│   ├── UIController          - モーダル/ポップアップ/ボタン状態
│   └── PresetController      - プリセット読み込み/適用
├── input/                    - 入力層
│   ├── KeyboardController    - キーボードショートカット
│   ├── MobileController      - モバイルタッチ操作
│   └── ModalController       - モーダル外クリック処理
├── ui/                       - UI層
│   ├── StatusDisplay         - ステータスバー表示
│   ├── SettingsModal         - 設定モーダル (プリセット/オーディオ設定)
│   ├── ToolbarController     - ツールバーボタン
│   └── DebugOverlay          - デバッグ情報オーバーレイ
├── editor/
│   └── Editor                - CodeMirror 6 GLSLエディタ
└── utils/
    ├── consts                - 定数定義
    ├── storage               - LocalStorage永続化
    ├── presets               - プリセット管理
    └── errors                - エラーハンドリング
```

## ディレクトリ構成

```
src/
├── index.html              - エントリポイント
├── main.js                 - ファサード (配線のみ、ロジックなし)
├── sw.js                   - Service Worker
├── styles.css
├── manifest.json           - PWAマニフェスト
│
├── audio/                  - オーディオ関連
│   ├── AudioEngine.js      - Web Audio API, AudioWorklet管理
│   ├── AudioAnalyzer.js    - 周波数解析
│   ├── AudioScheduler.js   - バッファスケジューリング
│   └── audio-worklet.js    - AudioWorkletProcessor
│
├── gl/                     - WebGL/シェーダー関連
│   ├── SoundRenderer.js    - サウンドシェーダー (Transform Feedback)
│   ├── VisualRenderer.js   - ビジュアルシェーダー
│   ├── ShaderCompiler.js   - シェーダービルド/コンパイル
│   ├── shader-templates.js - デフォルトシェーダー
│   └── gl-utils.js         - WebGLユーティリティ
│
├── controllers/            - コントローラー
│   ├── PlaybackController.js
│   ├── ShaderController.js
│   ├── UIController.js
│   └── PresetController.js
│
├── input/                  - 入力処理
│   ├── KeyboardController.js
│   ├── MobileController.js
│   └── ModalController.js
│
├── ui/                     - UI コンポーネント
│   ├── StatusDisplay.js    - ステータスバー表示
│   ├── SettingsModal.js    - 設定モーダル
│   ├── ToolbarController.js - ツールバー
│   └── DebugOverlay.js     - デバッグオーバーレイ
│
├── editor/                 - エディタ
│   └── Editor.js           - CodeMirror 6 GLSLエディタ
│
├── state/                  - 状態管理
│   ├── EventBus.js         - イベント駆動型通信
│   ├── PlaybackState.js    - 再生状態
│   └── AudioSettings.js    - 音声設定
│
└── utils/                  - ユーティリティ
    ├── consts.js           - 定数定義
    ├── storage.js          - LocalStorage操作
    ├── presets.js          - プリセット管理
    └── errors.js           - エラーハンドリング
```

## コーディング規約

- **直接インポート**: `index.js` による re-export パターンは使用しない。各ファイルから直接インポートすること（コードジャンプの利便性のため）
  ```js
  // Good
  import { AudioEngine } from './audio/AudioEngine.js';

  // Bad
  import { AudioEngine } from './audio/index.js';
  ```

- **npm scripts を使用**: lint/format/test は npx ではなく npm scripts を使うこと
  ```bash
  npm run lint        # Biome でチェック
  npm run lint:fix    # 自動修正
  npm run format      # フォーマット
  npm run test        # テスト実行
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

**Uniform:**
- `u_bpm` - BPM
- `u_sampleRate` - サンプルレート
- `u_blockOffset` - 現在のブロックオフセット

**定数:** `PI`, `TAU`

**組み込みユーティリティ:**
- `timeToBeat(time)` / `beatToTime(beat)` - 時間/ビート変換
- `mtof(note)` - MIDIノート→周波数 (A4 = 69 = 440Hz)
- `quantize(beat, division)` - ビートをグリッドに量子化
- `adsr(time, a, d, s, r, duration)` - ADSRエンベロープ
- `lfo(time, rate)` - LFO

**波形:** `sine(phase)`, `saw(phase)`, `square(phase)`, `triangle(phase)`

**ハッシュ:** `hash21(vec2)`, `hash22(vec2)` - 高品質ハッシュ関数

**ドラム:**
- `kick(time)`, `hihat(time)`, `openHihat(time)`, `snare(time)`
- `clap(time)`, `rim(time)`, `tom(time, freq)`

**シンセ:**
- `bass(time, freq, cutoff)`, `subBass(time, freq)`
- `lead(time, freq)`, `pad(time, freq, duration)`
- `filteredSaw(phase, cutoff)`

**エフェクト:**
- `distort(x, drive)` - ソフトクリッピング
- `lowpass(osc, cutoff)` - ローパス近似
- `bitcrush(x, bits)` - ビットクラッシュ
- `chorus(phase, depth, rate, time)` - コーラス

### ビジュアルシェーダー

`visualMain(vec2 uv, vec2 resolution)` を実装する。戻り値は `vec3` (RGB)

**Uniform:**
- `u_resolution` - 画面解像度
- `u_time` - 経過時間

**オーディオ解析 (スムージング済み、0-1):**
- `u_kick` - キック (20-80Hz)
- `u_hihat` - ハイハット (5000-12000Hz)
- `u_bass` - ベース (100-300Hz)

**ピーク値 (減衰付き、フラッシュエフェクト用):**
- `u_kickPeak`, `u_hihatPeak`, `u_bassPeak`

**オンセット検出 (ビート検出、1.0 or 0.0):**
- `u_kickOnset`, `u_hihatOnset`, `u_bassOnset`

**定数:** `PI`, `TAU`

**組み込みユーティリティ:**
- `hsv2rgb(vec3 c)` - HSV→RGB変換
- `rot2d(vec2 p, float a)` - 2D回転
- `sdCircle(vec2 p, float r)` - 円のSDF
- `sdPolygon(vec2 p, float r, float n)` - N角形のSDF

## キーボードショートカット

Mac: `Ctrl + (key)` / Windows: `Ctrl + Shift + (key)`

| キー | アクション |
|------|-----------|
| `P` | **P**lay/Pause (再生/一時停止) |
| `I` | **I**nitialize (リセット) |
| `C` | **C**ompile (シェーダーコンパイル) |
| `A` | **A**pply (コンパイル済みシェーダー適用) |
| `V` | **V**isibility (エディタ表示切替) |
| `M` | **M**ode (Sound/Visualモード切替) |
| `D` | **D**ebug (デバッグオーバーレイ) |
| `Escape` | モーダルを閉じる |

## 主要クラス

### SoundRenderer
- `compile(userCode)` - シェーダーコンパイル
- `generateAudioBuffer(blockOffset, bpm, sampleRate)` - オーディオバッファ生成 (Promise)
- `applyCompiledShader()` - コンパイル済みシェーダー適用
- `destroy()` - リソース解放

### VisualRenderer
- `init()` - WebGLコンテキスト初期化
- `compile(visualCode)` - シェーダーコンパイル
- `render(audioAnalysisData, time)` - 描画
- `applyCompiledShader()` - コンパイル済みシェーダー適用
- `destroy()` - リソース解放

### AudioEngine
- `init()` - AudioContext, AudioWorklet初期化
- `start(volume)` / `pause()` / `resume()` / `stop()` - 再生制御
- `setVolume(volume)` - ボリューム設定
- `onRequestNextBuffer` - バッファリクエストコールバック
- `destroy()` - リソース解放

### EventBus
- イベント駆動型状態管理
- `on(event, callback)` / `off(event, callback)` - イベント購読/解除
- `emit(event, data)` - イベント発行
- 主要イベント: `utils/consts.js` の `EVENTS` 参照

### PlaybackState / AudioSettings
- 状態管理 (再生状態、BPM、Volume など)
- EventBus 経由で変更を通知
