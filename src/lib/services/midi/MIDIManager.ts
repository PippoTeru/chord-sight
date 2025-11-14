/**
 * MIDIManager - Web MIDI API Input Handler
 *
 * MIDI入力を処理:
 * - デバイス検出と接続
 * - Note On/Off処理
 * - Control Change（サステインペダル等）
 * - イベントリスナー管理
 * - 依存性注入によるテスタビリティ
 */

import type {
  MIDIEvent,
  MIDIEventType,
  MIDIEventHandler,
  MIDINoteOnEvent,
  MIDINoteOffEvent,
  MIDIControlChangeEvent,
  MIDIInputInfo,
  MIDIState,
} from '$lib/types';
import { notificationStore } from '$lib/stores';
import { BrowserMIDIProvider, type IMIDIProvider, type IMIDIAccess } from './IMIDIProvider';

/**
 * MIDIManager設定
 */
export interface MIDIManagerConfig {
  sysex?: boolean; // SysExメッセージを有効化（デフォルト: false）
  software?: boolean; // ソフトウェアMIDIを含む（デフォルト: true）
}

/**
 * MIDI入力管理クラス（依存性注入対応）
 */
export class MIDIManager {
  private midiAccess: IMIDIAccess | null = null;
  private listeners: Map<MIDIEventType, Set<MIDIEventHandler>> = new Map();
  private isInitialized = false;
  private activeInputs: Map<string, MIDIInput> = new Map();
  private selectedDeviceId: string | null = null; // null = All Devices
  private activeNotes = new Set<number>(); // 現在ONになっているノート番号（バウンシング対策）
  private midiProvider: IMIDIProvider;
  private isPaused = false; // MIDI入力一時停止フラグ

  /**
   * コンストラクタ
   * @param midiProvider - MIDIプロバイダー（デフォルト: BrowserMIDIProvider）
   */
  constructor(midiProvider: IMIDIProvider = new BrowserMIDIProvider()) {
    this.midiProvider = midiProvider;
  }

  /**
   * 初期化
   */
  async initialize(config: MIDIManagerConfig = {}): Promise<boolean> {
    try {
      // MIDIアクセス要求（プロバイダー経由）
      this.midiAccess = await this.midiProvider.requestMIDIAccess({
        sysex: config.sysex || false,
        software: config.software !== false,
      });

      // 入力デバイスを接続
      this.connectInputs();

      // デバイス変更を監視
      this.midiAccess.onstatechange = () => {
        this.connectInputs();
      };

      this.isInitialized = true;

      // デバイス検出を確認
      const devices = this.getDevices();
      if (devices.length === 0) {
        notificationStore.warning('MIDIデバイスが検出されませんでした。デバイスを接続してください。');
      } else {
        notificationStore.info(`${devices.length}個のMIDIデバイスを検出しました。`);
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize MIDI:', error);

      // エラーメッセージを詳細化
      if (error instanceof Error) {
        if (error.message.includes('not supported')) {
          notificationStore.error(
            'Web MIDI APIがサポートされていません。Chrome、Edge、Operaなどのブラウザをご利用ください。'
          );
        } else {
          notificationStore.error(`MIDI初期化に失敗しました: ${error.message}`);
        }
      } else {
        notificationStore.error('MIDI初期化に失敗しました。ブラウザの設定を確認してください。');
      }

      return false;
    }
  }

  /**
   * 入力デバイスを接続
   */
  private connectInputs(): void {
    if (!this.midiAccess) return;

    // 既存の接続をクリア
    for (const input of this.activeInputs.values()) {
      input.onmidimessage = null;
    }
    this.activeInputs.clear();

    // 全入力デバイスを接続
    for (const input of this.midiAccess.inputs.values()) {
      if (input.state === 'connected') {
        input.onmidimessage = (event) => this.handleMIDIMessage(event);
        this.activeInputs.set(input.id, input);
      }
    }
  }

  /**
   * MIDIメッセージ処理
   */
  private handleMIDIMessage(event: MIDIMessageEvent): void {
    // 一時停止中は処理しない
    if (this.isPaused) {
      return;
    }

    // デバイスフィルタリング
    if (this.selectedDeviceId !== null && event.target) {
      const target = event.target as MIDIInput;
      if (target.id !== this.selectedDeviceId) {
        return; // 選択されたデバイス以外は無視
      }
    }

    const data = event.data;
    if (!data || data.length < 1) return;

    const status = data[0];
    const statusByte = status & 0xf0; // 上位4ビット（コマンド）
    const channel = status & 0x0f; // 下位4ビット（チャンネル）

    switch (statusByte) {
      case 0x90: // Note On
        if (data.length >= 3) {
          this.handleNoteOn(data[1], data[2], channel, event.timeStamp);
        }
        break;

      case 0x80: // Note Off
        if (data.length >= 3) {
          this.handleNoteOff(data[1], data[2], channel, event.timeStamp);
        }
        break;

      case 0xb0: // Control Change
        if (data.length >= 3) {
          this.handleControlChange(data[1], data[2], channel, event.timeStamp);
        }
        break;

      case 0xe0: // Pitch Bend
        if (data.length >= 3) {
          this.handlePitchBend(data[1], data[2], channel, event.timeStamp);
        }
        break;

      case 0xc0: // Program Change
        if (data.length >= 2) {
          this.handleProgramChange(data[1], channel, event.timeStamp);
        }
        break;

      default:
        // その他のメッセージは無視
        break;
    }
  }

  /**
   * Note On処理
   */
  private handleNoteOn(note: number, velocity: number, channel: number, timestamp: number): void {
    // velocity=0はNote Offとして扱う（MIDI仕様）
    if (velocity === 0) {
      this.handleNoteOff(note, 0, channel, timestamp);
      return;
    }

    // バウンシング対策: NOTE OFFが来ていない状態での重複NOTE ONを無視
    if (this.activeNotes.has(note)) {
      return;
    }

    // アクティブノートに追加
    this.activeNotes.add(note);

    const event: MIDINoteOnEvent = {
      type: 'noteon',
      note,
      velocity,
      channel,
      timestamp,
    };

    this.emit('noteon', event);
  }

  /**
   * Note Off処理
   */
  private handleNoteOff(note: number, velocity: number, channel: number, timestamp: number): void {
    // アクティブノートから削除
    this.activeNotes.delete(note);

    const event: MIDINoteOffEvent = {
      type: 'noteoff',
      note,
      velocity,
      channel,
      timestamp,
    };

    this.emit('noteoff', event);
  }

  /**
   * Control Change処理
   */
  private handleControlChange(
    controller: number,
    value: number,
    channel: number,
    timestamp: number
  ): void {
    const event: MIDIControlChangeEvent = {
      type: 'cc',
      controller,
      value,
      channel,
      timestamp,
    };

    this.emit('cc', event);
  }

  /**
   * Pitch Bend処理
   */
  private handlePitchBend(lsb: number, msb: number, channel: number, timestamp: number): void {
    // 14ビット値に変換（-8192 ~ +8191）
    const value = ((msb << 7) | lsb) - 8192;

    const event = {
      type: 'pitchbend' as const,
      value,
      channel,
      timestamp,
    };

    this.emit('pitchbend', event);
  }

  /**
   * Program Change処理
   */
  private handleProgramChange(program: number, channel: number, timestamp: number): void {
    const event = {
      type: 'programchange' as const,
      program,
      channel,
      timestamp,
    };

    this.emit('programchange', event);
  }

  /**
   * イベントリスナー登録
   */
  on<T extends MIDIEventType>(eventType: T, handler: MIDIEventHandler): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
  }

  /**
   * イベントリスナー解除
   */
  off<T extends MIDIEventType>(eventType: T, handler: MIDIEventHandler): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * イベント発火
   */
  private emit(eventType: MIDIEventType, event: MIDIEvent): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in MIDI event handler (${eventType}):`, error);
        }
      }
    }
  }

  /**
   * 接続されているデバイス情報を取得
   */
  getDevices(): MIDIInputInfo[] {
    if (!this.midiAccess) return [];

    const devices: MIDIInputInfo[] = [];

    for (const input of this.midiAccess.inputs.values()) {
      devices.push({
        id: input.id,
        name: input.name || 'Unknown Device',
        manufacturer: input.manufacturer || 'Unknown',
        state: input.state,
        connection: input.connection,
      });
    }

    return devices;
  }

  /**
   * MIDI状態を取得
   */
  getState(): MIDIState {
    const devices = this.getDevices();

    return {
      isSupported: !!navigator.requestMIDIAccess,
      isInitialized: this.isInitialized,
      hasDevices: devices.length > 0,
      activeDevices: devices.filter((d) => d.state === 'connected'),
    };
  }

  /**
   * MIDIデバイスを選択
   * @param deviceId - デバイスID（null = All Devices）
   */
  selectDevice(deviceId: string | null): void {
    this.selectedDeviceId = deviceId;
  }

  /**
   * MIDI入力を一時停止
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * MIDI入力を再開
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * クリーンアップ
   */
  dispose(): void {
    // 全てのリスナーをクリア
    this.listeners.clear();

    // 入力デバイスの接続を解除
    for (const input of this.activeInputs.values()) {
      input.onmidimessage = null;
    }
    this.activeInputs.clear();

    this.midiAccess = null;
    this.isInitialized = false;
  }
}
