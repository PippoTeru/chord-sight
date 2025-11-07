/**
 * Audio Type Definitions
 *
 * Web Audio API関連の型定義（v2.1仕様対応）
 */

import type { Zone } from './sf2.types';

/**
 * アクティブなボイス（v2.1: zone情報追加）
 */
export interface Voice {
  id: number;                           // 一意のID
  midiNote: number;                     // MIDI番号（21-108）
  velocity: number;                     // ベロシティ（0-127）
  leftSource: AudioBufferSourceNode;    // L用ソース
  rightSource: AudioBufferSourceNode;   // R用ソース
  gainNode: GainNode;                   // ゲインノード
  merger: ChannelMergerNode;            // ステレオ合成ノード
  startTime: number;                    // 開始時刻（AudioContext時刻）
  releaseTime?: number;                 // リリース時刻（AudioContext時刻）
  isReleasing: boolean;                 // リリース中フラグ
  zones: Zone[];                        // ⭐ v2.1追加: リリース時間計算用
}

/**
 * ステレオペア情報
 */
export interface StereoPair {
  leftZone: Zone;
  rightZone: Zone;
  leftSampleId: number;
  rightSampleId: number;
}

/**
 * ピッチ計算パラメータ
 */
export interface PitchParams {
  midiNote: number;          // 再生するMIDI番号
  originalPitch: number;     // サンプルの元のピッチ
  pitchCorrection: number;   // サンプルのピッチ補正（セント）
  fineTune: number;          // ゾーンのfineTune（セント）
  sampleRate: number;        // サンプルのサンプルレート
  contextRate: number;       // AudioContextのサンプルレート
}

/**
 * エンベロープパラメータ
 */
export interface EnvelopeParams {
  attack?: number;           // アタック時間（秒）
  hold?: number;             // ホールド時間（秒）
  decay?: number;            // ディケイ時間（秒）
  sustain?: number;          // サステインレベル（0-1）
  release?: number;          // リリース時間（秒）
}

/**
 * オーディオ設定
 */
export interface AudioConfig {
  sampleRate?: number;       // サンプルレート（デフォルト: 44100）
  latencyHint?: AudioContextLatencyCategory; // レイテンシヒント
  maxPolyphony?: number;     // 最大ポリフォニー（デフォルト: 64）
  cacheSize?: number;        // キャッシュサイズ（デフォルト: 100-200）
}

/**
 * オーディオ状態
 */
export interface AudioState {
  isInitialized: boolean;
  isLoading: boolean;
  activeVoiceCount: number;
  sustainPedalDown: boolean;
  memoryUsage?: number;      // メモリ使用量（MB）
  latency?: number;          // レイテンシ（ms）
}
