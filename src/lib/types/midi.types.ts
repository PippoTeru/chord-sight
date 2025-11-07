/**
 * MIDI Type Definitions
 *
 * Web MIDI API関連の型定義
 */

/**
 * MIDIイベントタイプ
 */
export type MIDIEventType = 'noteon' | 'noteoff' | 'cc' | 'pitchbend' | 'programchange';

/**
 * Note Onイベント
 */
export interface MIDINoteOnEvent {
  type: 'noteon';
  note: number;        // MIDI番号（0-127）
  velocity: number;    // ベロシティ（0-127）
  channel: number;     // MIDIチャンネル（0-15）
  timestamp: number;   // イベント発生時刻（ms）
}

/**
 * Note Offイベント
 */
export interface MIDINoteOffEvent {
  type: 'noteoff';
  note: number;
  velocity: number;
  channel: number;
  timestamp: number;
}

/**
 * Control Changeイベント
 */
export interface MIDIControlChangeEvent {
  type: 'cc';
  controller: number;  // コントローラー番号（0-127）
  value: number;       // コントローラー値（0-127）
  channel: number;
  timestamp: number;
}

/**
 * Pitch Bendイベント
 */
export interface MIDIPitchBendEvent {
  type: 'pitchbend';
  value: number;       // ピッチベンド値（-8192 ~ +8191）
  channel: number;
  timestamp: number;
}

/**
 * Program Changeイベント
 */
export interface MIDIProgramChangeEvent {
  type: 'programchange';
  program: number;     // プログラム番号（0-127）
  channel: number;
  timestamp: number;
}

/**
 * MIDIイベント（ユニオン型）
 */
export type MIDIEvent =
  | MIDINoteOnEvent
  | MIDINoteOffEvent
  | MIDIControlChangeEvent
  | MIDIPitchBendEvent
  | MIDIProgramChangeEvent;

/**
 * MIDIイベントハンドラー
 */
export type MIDIEventHandler<T extends MIDIEvent = MIDIEvent> = (event: T) => void;

/**
 * MIDI入力デバイス情報
 */
export interface MIDIInputInfo {
  id: string;
  name: string;
  manufacturer: string;
  state: 'connected' | 'disconnected';
  connection: 'open' | 'closed' | 'pending';
}

/**
 * MIDI状態
 */
export interface MIDIState {
  isSupported: boolean;      // Web MIDI API対応
  isInitialized: boolean;    // 初期化済み
  hasDevices: boolean;       // デバイスあり
  activeDevices: MIDIInputInfo[];
  lastEvent?: MIDIEvent;
}

/**
 * コントロールチェンジ番号（主要なもの）
 */
export enum MIDIControlChange {
  // Standard Controllers
  BankSelect = 0,
  ModulationWheel = 1,
  BreathController = 2,
  FootController = 4,
  PortamentoTime = 5,
  DataEntry = 6,
  Volume = 7,
  Balance = 8,
  Pan = 10,
  Expression = 11,

  // Sustain Pedal
  SustainPedal = 64,        // ⭐ サステインペダル（最重要）
  Portamento = 65,
  Sostenuto = 66,
  SoftPedal = 67,

  // Sound Controllers
  ReverbSend = 91,
  ChorusSend = 93,

  // Mode Messages
  AllSoundOff = 120,
  ResetAllControllers = 121,
  AllNotesOff = 123,
}
