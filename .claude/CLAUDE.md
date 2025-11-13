# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 言語設定

**CRITICAL: 必ず日本語で応答してください**

- すべての説明、コメント、会話は日本語で行う
- 技術用語は日本語で説明する（例: component → コンポーネント、props → プロパティ）
- コード以外のすべてのテキストは日本語にする
- ファイル名やパスの説明も日本語の文脈で行う

## プロジェクト概要

**ChordSight** は、88鍵盤（A0～C8）のピアノ鍵盤を表示し、リアルタイムでコード検出を行うSvelteKitアプリケーションです。MIDI入力に対応しており、演奏したコードを即座に分析・表示します。音楽理論に基づいた正確なコード検出と、複数候補の表示機能を備えています。

**技術スタック:**
- SvelteKit 2.x + TypeScript
- Svelte 5.x（runes対応）
- Vite（ビルドツール）

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev
# → http://localhost:5173/ で起動
# ⚠️ 重要: 開発サーバーは通常ポート5173で実行中です。
#          新しいサーバーを立ち上げる前に、既存のサーバーが動作していないか必ず確認してください。

# 本番ビルド
npm run build

# 本番ビルドのプレビュー
npm run preview
```

## デプロイ

このプロジェクトはCloudflare Pages/Workersにデプロイするよう設定されています（`@sveltejs/adapter-cloudflare`を使用）。

## アーキテクチャ

### コンポーネント構成

- **[src/lib/components/VirtualKeyboard.svelte](src/lib/components/VirtualKeyboard.svelte)** - 88鍵盤のピアノ鍵盤を描画するメインコンポーネント。SVGベースのレンダリング、MIDI入力による視覚的フィードバック、サステインペダルインジケーターを実装。
- **[src/lib/components/ChordDisplay.svelte](src/lib/components/ChordDisplay.svelte)** - 検出されたコード名を大きく表示するコンポーネント。複数候補の表示、ビューポート幅に応じた自動フォントサイズ調整、MNoto Sansフォントを使用した音楽記号表示を実装。
- **[src/lib/components/Settings.svelte](src/lib/components/Settings.svelte)** - 設定パネル（MIDIデバイス選択、視覚的フィードバックのON/OFF、サステインインジケーター表示、テーマ設定）
- **[src/lib/components/StatusBar.svelte](src/lib/components/StatusBar.svelte)** - ステータスバー（アプリケーション名を表示）
- **[src/routes/+page.svelte](src/routes/+page.svelte)** - メインページ（上部にコード表示と設定パネル、下部にピアノ鍵盤、最下部にステータスバーを配置）
- **[src/routes/+layout.svelte](src/routes/+layout.svelte)** - ルートレイアウト（CSSリセットを読み込む）

### VirtualKeyboardコンポーネントのアーキテクチャ

SVGベースのレンダリング方式を採用しています：

**データモデル:**
```typescript
interface WhitePianoKey {
  note: WhiteNoteName; // 白鍵の音名（C, D, E, F, G, A, B）
  octave: number;      // オクターブ番号（0-8）
  midiNumber: number;  // MIDI番号（21-108）
  isBlack: false;      // 白鍵フラグ
  isActive: boolean;   // アクティブ状態（MIDI入力でハイライト）
}

interface BlackPianoKey {
  note: BlackNoteName; // 黒鍵の音名（C#, D#, F#, G#, A#）
  octave: number;      // オクターブ番号（0-7）
  midiNumber: number;  // MIDI番号（22-106）
  isBlack: true;       // 黒鍵フラグ
  isActive: boolean;   // アクティブ状態（MIDI入力でハイライト）
}
```

**鍵盤データの生成:**
- 白鍵（52個）と黒鍵（36個）を別々の配列で管理
- 描画順序：白鍵→黒鍵（SVGのz-index制御のため）

**SVG座標系:**
- ViewBox: `0 0 1222 150`（幅 = 白鍵52個 × 23.5）
- すべての寸法と位置は固定座標系を使用し、レスポンシブにスケール

**黒鍵の配置アルゴリズム:**
N等分アルゴリズムを使用して黒鍵を配置：
- C～Eグループ: 3個の白鍵を5等分
- F～Bグループ: 4個の白鍵を7等分
- これにより、白鍵の見える部分が均等に配置されます

詳細な数式と位置計算については[specifications.md](specifications.md)を参照してください。

### MIDI統合（実装済み）

**MIDIManager ([src/lib/services/midi/MIDIManager.ts](src/lib/services/midi/MIDIManager.ts))**

Web MIDI APIを使用したMIDI入力処理を実装：
- デバイス検出と接続管理
- Note On/Off処理（バウンシング対策付き）
- Control Change処理（サステインペダル CC#64）
- デバイス選択機能（特定デバイスまたは全デバイス）
- イベントリスナーパターンによる柔軟なイベント処理

**重要な実装詳細:**
- バウンシング対策: Note Offが来ていない状態での重複Note Onを無視
- サステインペダル: CC#64の値が64以上でON、未満でOFF
- ペダル離し時の動作: 保持していた全てのキーをクリア

### コード検出システム

**検出アルゴリズム ([src/lib/utils/chordDetector.ts](src/lib/utils/chordDetector.ts))**

多段階のコード検出を実装：

1. **ピッチクラス正規化**: MIDI番号をピッチクラス（0-11）に変換し、最低音を基準に並べ替え
2. **3種類のマップで検索**:
   - Standard Map: 基本的なコード（メジャー、マイナー、7th等）
   - Generated Map: 複雑なテンションコード（9th, 11th, 13th等）を自動生成
   - Generated Map with Omit: オミットコード（omit5等）を含む
3. **転回形検出**: ベース音を除いた検索、配列を回転させた検索によりスラッシュコードを検出
4. **スコアリング**: 複数候補をスコアリングし、最適なコード名を選択
5. **表示変換**: MNoto Sansフォント用に変換（♭、♯、△等の音楽記号を使用）

**特殊ケース:**
- 1音: 何も表示しない
- 2音: パワーコード（5th）のみ表示（例: C5）
- 3音以上: 通常のコード検出を実行

### 状態管理（Svelte Stores）

**midiStore ([src/lib/stores/midiStore.ts](src/lib/stores/midiStore.ts))**
- `activeKeys`: 現在押されているMIDI音番号のSet
- `sustainPedalDown`: サステインペダルの状態（boolean）
- `midiEnabled`: MIDI初期化状態
- `initializeMIDI()`: MIDIManagerを初期化し、イベントリスナーを登録
- `getMIDIManager()`: MIDIManagerインスタンスを取得

**settings ([src/lib/stores/settings.svelte.ts](src/lib/stores/settings.svelte.ts))**（Svelte 5 runes版）
- `accidentalNotation`: ♯/♭表記の選択（'sharp' | 'flat'）
- `setAccidentalNotation()`: 表記設定を変更（localStorageに保存）

**settingsStore ([src/lib/stores/settingsStore.ts](src/lib/stores/settingsStore.ts))**（旧バージョン）
- `settings`: アプリケーション設定（MIDIデバイス選択、視覚的フィードバック、サステインインジケーター、テーマモード）
- `isSettingsOpen`: 設定パネルの開閉状態
- `isDarkMode`: 実際に適用されるダークモード状態（systemテーマを考慮）

## 重要な実装詳細

### VirtualKeyboardコンポーネント

1. **座標計算**: すべての鍵盤位置は数学的に計算されており、ハードコードされていません。`getWhiteKeyIndex()`と`getBlackKeyX()`関数が複雑な配置ロジックを処理しています。

2. **下部角丸**: 鍵盤は、実際のピアノ鍵盤を模倣するため、カスタムSVGパス（`createRoundedBottomPath`）を使用して下部のみ角丸を実現しています。

3. **MIDI番号マッピング**: A0=21、C8=108という標準MIDI仕様に従っています。生成関数は88鍵盤の不規則なパターン（A0、B0から始まる）を適切に処理します。

4. **ラベル表示**: C鍵盤のみ（C1～C8）、白鍵の下部にオクターブラベルを表示します。

5. **視覚的フィードバック**: `isKeyActive()`関数が設定とactiveKeysストアを参照し、MIDI入力時に鍵盤の色を変更します。

### ChordDisplayコンポーネント

1. **自動フォントサイズ調整**: コード名の幅がビューポート幅を超える場合、自動的にフォントサイズを縮小します（`adjustFontSize()`関数）。

2. **複数候補の表示**: 第1候補を大きく表示し、第2・第3候補を下部に小さく表示します。

3. **MNoto Sansフォント**: 音楽記号（♭、♯、△、⁄等）を美しく表示するためのカスタムフォントを使用。

### コード検出

1. **スコアリングアルゴリズム**:
   - ルート音がベース音と一致する場合は優先
   - スラッシュコードよりも通常のコードを優先
   - シンプルなコード名を優先（短い方が高スコア）

2. **括弧統合**: `mergeParentheses()`関数により、連続する括弧を1つに統合（例: `C(9)(13)` → `C(9,13)`）

3. **♯/♭の選択**: 設定により♯表記（C#, D#等）または♭表記（Db, Eb等）を切り替え可能

### 型定義

**[src/lib/types/midi.types.ts](src/lib/types/midi.types.ts)**
- `MIDIEvent`: MIDIイベントのユニオン型（NoteOn, NoteOff, CC, PitchBend, ProgramChange）
- `MIDIInputInfo`: MIDI入力デバイス情報
- `MIDIState`: MIDI状態（対応状況、初期化状態、デバイス情報）
- `MIDIControlChange`: 主要なコントロールチェンジ番号のenum（SustainPedal=64等）

## 重要な作業ルール

**CRITICAL: コード実装前の確認ルール**

実装やファイル変更を行う前に、**必ず以下を実行してください**：

1. **ユーザーに確認を取る**:
   - 何をするのか明確に説明する
   - どのファイルを変更するのか列挙する
   - どのような変更を加えるのか説明する
   - ユーザーの許可を得てから実行する

2. **調査・分析のみを先に行う**:
   - ファイルを読む
   - コードを分析する
   - 問題点を特定する
   - 解決策を提案する
   - **ユーザーが「実装して」と明示的に指示するまで実装しない**

3. **勝手に実装しない**:
   - ファイルの編集（Edit）
   - ファイルの作成（Write）
   - ファイルの削除
   - これらは全て**ユーザーの明示的な許可が必要**

**違反例**：
- ❌ 「修正します」と言ってすぐにEditツールを使う
- ❌ 「新しいファイルを作成します」と言ってすぐにWriteツールを使う
- ❌ ユーザーが「分析して」と言っているのに勝手に実装する

**正しい例**：
- ✅ 問題を分析して、解決策を提案し、「実装しましょうか？」と確認する
- ✅ 変更内容を説明し、「この変更で良いですか？」と確認する
- ✅ ユーザーが「実装して」と言ってから実装する

4. **実装前の検証**:
   - 複雑な機能（Canvas API、Web Audio API、複雑なDOM操作等）を実装する際は、実装後に必ず動作確認を行う
   - ビルドエラーがないことを確認する
   - ブラウザのコンソールログでエラーが出ていないか確認する
   - 実装したコードが実際に期待通り動作するか検証する
   - **検証せずに「完了しました」と報告しない**
