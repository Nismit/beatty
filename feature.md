# Beatty 機能追加計画

## 1. シェーダープリセット機能

### 概要
複数のシェーダーを名前付きで保存・管理し、切り替えやエクスポート/インポートができる機能。

### 仕様

| 項目 | 仕様 |
|------|------|
| 保存単位 | Sound + Visual をセットで1プリセット |
| 保存上限 | 20個 |
| サムネイル | なし（名前と日時で管理） |
| UI形式 | モーダル（既存のヘルプモーダルと同様） |
| 名前入力 | `window.prompt()` |
| デフォルト | プリセット一覧に "Default" として常に表示 |
| Export/Import | JSONファイルのみ |

### 機能要件

#### 保存
- 現在のエディタ内容（Sound/Visual両方）を名前付きで保存
- `window.prompt()` で名前を入力
- 空文字の場合は保存キャンセル
- 同名プリセットが存在する場合は上書き確認
- 上限（20個）到達時はエラー表示

#### 読み込み
- プリセット選択でエディタに反映
- 現在の編集内容は破棄される旨の確認（未保存変更がある場合）
- 読み込み後は自動コンパイル

#### 削除
- プリセット個別削除（確認ダイアログあり）
- "Default" は削除不可

#### エクスポート
- 選択したプリセットをJSONファイルとしてダウンロード
- ファイル名: `{プリセット名}.json`

#### インポート
- JSONファイルをアップロード
- バリデーション（必須フィールド、コードの存在確認）
- 同名プリセットが存在する場合は上書き確認

### データ構造

```js
// LocalStorage キー: beatty_presets
{
  presets: [
    {
      id: "uuid-v4",
      name: "My Preset",
      soundCode: "vec2 mainSound(float time) { ... }",
      visualCode: "vec3 visualMain(vec2 uv, vec2 resolution) { ... }",
      createdAt: 1234567890000,  // Unix timestamp (ms)
      updatedAt: 1234567890000
    }
  ],
  version: 1
}

// エクスポート用 JSON（単一プリセット）
{
  name: "My Preset",
  soundCode: "...",
  visualCode: "...",
  exportedAt: 1234567890000,
  version: 1
}
```

### UI設計

#### プリセットボタン
- モバイルコントロールに追加（アイコン: `💾` または `☰`）
- キーボードショートカット: `Cmd/Ctrl + G`

#### プリセットモーダル

```
┌─────────────────────────────────────────────┐
│ Presets                              [×]    │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ ★ Default                          │    │
│  │   Built-in preset                   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ My Preset 1              [📤] [🗑]  │    │
│  │   Updated: 2024/01/15 14:30         │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Techno Beat              [📤] [🗑]  │    │
│  │   Updated: 2024/01/14 10:00         │    │
│  └─────────────────────────────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│ [Save Current]              [Import JSON]   │
└─────────────────────────────────────────────┘
```

- プリセット行クリックで読み込み
- `📤` エクスポートボタン
- `🗑` 削除ボタン（Default以外）
- `Save Current` 現在のシェーダーを新規保存
- `Import JSON` ファイル選択ダイアログ

### 実装ファイル

| ファイル | 役割 |
|----------|------|
| `src/utils/presets.js` | プリセットのCRUD、LocalStorage操作 |
| `src/ui/PresetModal.js` | モーダルUI |
| `src/controllers/PresetController.js` | ビジネスロジック |
| `src/input/KeyboardController.js` | ショートカット追加 |
| `src/input/MobileController.js` | ボタン追加 |

### ユーティリティ関数

```js
// src/utils/presets.js

/** UUID v4 生成 */
function generateId() {
  return crypto.randomUUID();
}

/** プリセット一覧取得 */
function getPresets() {}

/** プリセット保存 */
function savePreset(name, soundCode, visualCode) {}

/** プリセット更新 */
function updatePreset(id, soundCode, visualCode) {}

/** プリセット削除 */
function deletePreset(id) {}

/** プリセット取得（単一） */
function getPreset(id) {}

/** プリセット数取得 */
function getPresetCount() {}

/** エクスポート用JSON生成 */
function exportPreset(id) {}

/** インポート（バリデーション付き） */
function importPreset(json) {}
```

### エラーハンドリング

| ケース | 対応 |
|--------|------|
| 上限到達 | 「プリセット数が上限(20)に達しています」 |
| 同名存在 | 「"{name}" は既に存在します。上書きしますか？」 |
| インポート失敗 | 「無効なファイル形式です」 |
| LocalStorage容量超過 | 「保存容量が不足しています。不要なプリセットを削除してください」 |

---

## 2. 録音/エクスポート機能

### 概要
生成したオーディオやビジュアルを録画し、ファイルとしてダウンロードできる機能。

### 機能要件

#### オーディオ録音
- WAV形式でオーディオをエクスポート
- 録音開始/停止ボタン
- 録音時間の指定（例: 4小節、8小節、または手動停止）
- リアルタイム録音 or オフライン高速レンダリング

#### ビデオ録画（オプション）
- WebM形式でキャンバス + オーディオを録画
- MediaRecorder API 使用
- フレームレート指定（30fps/60fps）

### 実装方針

#### オーディオ録音
1. **リアルタイム録音**
   - AudioWorklet の出力を ScriptProcessorNode または MediaStreamDestination 経由でキャプチャ
   - MediaRecorder で WebM(audio) → WAV 変換、または直接 Float32Array を蓄積して WAV 生成

2. **オフラインレンダリング**（高品質）
   - 指定時間分の Transform Feedback を一括実行
   - Float32Array を WAV ファイルとしてエンコード
   - 再生せずに高速生成可能

#### ビデオ録画
1. `canvas.captureStream()` でビデオストリーム取得
2. `audioContext.createMediaStreamDestination()` でオーディオストリーム取得
3. 両方を結合して MediaRecorder で録画

### UI案
- 録音ボタン（`⏺`）をモバイルコントロールに追加
- 録音中は赤いインジケーター表示
- 停止後に自動ダウンロード、またはプレビューモーダル

### WAV エンコード

```js
function encodeWAV(samples, sampleRate, numChannels) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // samples (Float32 → Int16)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
```

---

## 3. パフォーマンス表示

### 概要
FPS、オーディオバッファ状態、GPU負荷などをリアルタイム表示するデバッグ/モニタリング機能。

### 表示項目

| 項目 | 説明 |
|------|------|
| FPS | フレームレート（requestAnimationFrame ベース） |
| Frame Time | 1フレームの処理時間 (ms) |
| Audio Buffer | バッファキューの状態（remaining/total） |
| GPU Time | Transform Feedback / Render の所要時間（`EXT_disjoint_timer_query_webgl2` 使用、対応ブラウザのみ） |

### 実装方針

#### FPS計測
```js
class FPSCounter {
  constructor(sampleSize = 60) {
    this.times = [];
    this.sampleSize = sampleSize;
  }

  tick(timestamp) {
    this.times.push(timestamp);
    if (this.times.length > this.sampleSize) {
      this.times.shift();
    }
  }

  getFPS() {
    if (this.times.length < 2) return 0;
    const elapsed = this.times[this.times.length - 1] - this.times[0];
    return Math.round((this.times.length - 1) / (elapsed / 1000));
  }
}
```

#### Frame Time
- `performance.now()` でフレーム開始/終了時刻を計測
- 移動平均で平滑化

#### Audio Buffer 状態
- AudioScheduler のバッファキュー長を取得
- バッファアンダーラン検出

### UI案

#### ミニマル表示
- 画面右上に小さく FPS 表示（例: `60 fps`）
- クリックで詳細パネル展開

#### 詳細パネル
```
┌─────────────────────┐
│ Performance         │
├─────────────────────┤
│ FPS: 60             │
│ Frame: 2.1ms        │
│ Audio: 3/4 buffers  │
│ GPU: 0.8ms          │
└─────────────────────┘
```

### 設定
- デフォルトは非表示
- キーボードショートカット（`Cmd/Ctrl + D`）またはヘルプモーダルから有効化
- LocalStorage で表示設定を保存

---

## 優先度

| 機能 | 優先度 | 工数目安 | 依存関係 |
|------|--------|----------|----------|
| パフォーマンス表示 | 高 | 小 | なし |
| オーディオ録音 | 高 | 中 | なし |
| シェーダープリセット | 高 | 中 | presets.js 新規作成 |
| ビデオ録画 | 低 | 大 | オーディオ録音 |

---

## 実装順序案

1. **Phase 1**: パフォーマンス表示（FPS + Frame Time）
2. **Phase 2**: シェーダープリセット（保存/読み込み/削除/Export/Import）
3. **Phase 3**: オーディオ録音（オフラインレンダリング方式）
4. **Phase 4**: ビデオ録画（オプション）
