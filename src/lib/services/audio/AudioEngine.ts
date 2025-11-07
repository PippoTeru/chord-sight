/**
 * AudioEngine - Integrated MIDI + SF2 Audio Engine
 *
 * MIDIManagerとSoundEngineを統合し、
 * ピアノアプリケーションの音声エンジンを提供します。
 */

import type { SF2Data } from '$lib/types/sf2.types';
import { SF2Parser } from '$lib/services/sf2/SF2Parser';
import { SampleManager } from '$lib/services/sf2/SampleManager';
import { SoundEngine } from '$lib/services/sf2/SoundEngine';
import { MIDIManager } from '$lib/services/midi/MIDIManager';
import { MIDIControlChange } from '$lib/types/midi.types';

/**
 * AudioEngine設定
 */
export interface AudioEngineConfig {
  sf2Url: string; // SF2ファイルのURL
  maxPolyphony?: number;
  cacheSize?: number;
  onNoteOn?: (midiNote: number, velocity: number) => void; // 視覚的フィードバック用コールバック
  onNoteOff?: (midiNote: number) => void; // 視覚的フィードバック用コールバック
  onSustainPedal?: (isDown: boolean) => void; // サステインペダル状態変更コールバック
  onProgress?: (progress: number) => void; // ローディング進捗コールバック（0-100）
}

/**
 * AudioEngine状態
 */
export interface AudioEngineState {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  midiEnabled: boolean;
  activeVoices: number;
  loadingProgress: number; // 0-100のパーセンテージ
}

/**
 * 統合オーディオエンジン
 */
export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private sf2Data: SF2Data | null = null;
  private sampleManager: SampleManager | null = null;
  private soundEngine: SoundEngine | null = null;
  private midiManager: MIDIManager | null = null;
  private resumePromise: Promise<void> | null = null; // 🔴 修正: Race condition防止
  private onNoteOnCallback?: (midiNote: number, velocity: number) => void;
  private onNoteOffCallback?: (midiNote: number) => void;
  private onSustainPedalCallback?: (isDown: boolean) => void;
  private transpose: number = 0;
  private userInteractionHandler: (() => void) | null = null;
  private onProgressCallback?: (progress: number) => void;

  private state: AudioEngineState = {
    isLoading: false,
    isReady: false,
    error: null,
    midiEnabled: false,
    activeVoices: 0,
    loadingProgress: 0,
  };

  /**
   * 初期化
   */
  async initialize(config: AudioEngineConfig): Promise<boolean> {
    this.state.isLoading = true;
    this.state.error = null;

    // コールバックを保存
    this.onNoteOnCallback = config.onNoteOn;
    this.onNoteOffCallback = config.onNoteOff;
    this.onSustainPedalCallback = config.onSustainPedal;
    this.onProgressCallback = config.onProgress;

    try {
      // AudioContext作成
      this.audioContext = new AudioContext();
      console.log('✅ AudioContext created');

      // ユーザーインタラクションでAudioContextを自動再開
      this.setupUserInteractionListener();

      // SF2ファイルをダウンロード（0%～99%）
      console.log('📂 Loading SF2 file...');
      this.updateProgress(0);
      const arrayBuffer = await this.downloadSF2WithProgress(config.sf2Url);
      console.log(`   File size: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

      // SF2ファイルをパース（99%）
      console.log('⚙️  Parsing SF2 file...');
      const parser = new SF2Parser();
      this.sf2Data = parser.parse(arrayBuffer);
      console.log(`   Parsed ${this.sf2Data.samples.length} samples`);

      // SampleManager初期化（99%）
      this.sampleManager = new SampleManager(this.sf2Data, {
        audioContext: this.audioContext,
        maxCacheSize: config.cacheSize || 150,
      });
      console.log('✅ SampleManager initialized');

      // SoundEngine初期化（99%）
      this.soundEngine = new SoundEngine(this.audioContext, this.sampleManager, this.sf2Data, {
        maxPolyphony: config.maxPolyphony || 64,
      });
      console.log('✅ SoundEngine initialized');

      // MIDIManager初期化（100%）
      await this.initializeMIDI();
      this.updateProgress(100);

      // 初期化完了
      this.state.isLoading = false;
      this.state.isReady = true;
      console.log('🎉 AudioEngine ready!');

      // 100%を表示してから500ms後にプログレスバーを消す
      await new Promise(resolve => setTimeout(resolve, 500));
      this.state.loadingProgress = 0;

      return true;
    } catch (error) {
      this.state.isLoading = false;
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ AudioEngine initialization failed:', error);
      return false;
    }
  }

  /**
   * ローディング進捗を更新
   */
  private updateProgress(progress: number): void {
    this.state.loadingProgress = progress;
    // console.log(`📊 Loading progress: ${progress}%`);
    this.onProgressCallback?.(progress);
  }

  /**
   * SF2ファイルをダウンロード（プログレス付き）
   * @param url - SF2ファイルのURL
   * @returns ArrayBuffer
   */
  private async downloadSF2WithProgress(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch SF2 file: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;
    let lastReportedProgress = -1;

    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        loaded += value.length;

        if (total > 0) {
          // 0%～99%の範囲でプログレスを更新（ダウンロードは全体の99%）
          const rawProgress = (loaded / total) * 99;
          const progress = loaded >= total ? 99 : Math.min(98.9, Math.round(rawProgress * 10) / 10);

          // 進捗が変わった時だけ更新（0.1%刻み）
          if (progress !== lastReportedProgress) {
            this.updateProgress(progress);
            lastReportedProgress = progress;
          }
        }
      }
    }

    // Uint8Arrayを結合してArrayBufferに変換
    const chunksAll = new Uint8Array(loaded);
    let position = 0;
    for (const chunk of chunks) {
      chunksAll.set(chunk, position);
      position += chunk.length;
    }

    return chunksAll.buffer;
  }

  /**
   * ユーザーインタラクションでAudioContextを再開
   */
  private setupUserInteractionListener(): void {
    this.userInteractionHandler = () => {
      if (this.audioContext?.state === 'suspended') {
        this.audioContext.resume().then(() => {
          console.log('✅ AudioContext resumed by user interaction');
        });
      }
    };

    // click, keydown, touchstart のいずれかで再開
    document.addEventListener('click', this.userInteractionHandler);
    document.addEventListener('keydown', this.userInteractionHandler);
    document.addEventListener('touchstart', this.userInteractionHandler);
  }

  /**
   * MIDI初期化
   */
  private async initializeMIDI(): Promise<void> {
    try {
      this.midiManager = new MIDIManager();
      const success = await this.midiManager.initialize();

      if (success) {
        // Note On
        this.midiManager.on('noteon', async (event) => {
          if (this.soundEngine && event.type === 'noteon') {
            // AudioContextがsuspendedの場合は音を鳴らさない（視覚フィードバックのみ）
            if (this.audioContext?.state === 'suspended') {
              console.warn('⚠️ AudioContext is suspended. Click the page to enable audio.');
              // 視覚的フィードバックのみ実行
              this.onNoteOnCallback?.(event.note, event.velocity);
              return;
            }
            const transposedNote = event.note + this.transpose;
            this.soundEngine.noteOn(transposedNote, event.velocity);
            // 視覚的フィードバック用コールバック呼び出し（元のノート番号）
            this.onNoteOnCallback?.(event.note, event.velocity);
          }
        });

        // Note Off
        this.midiManager.on('noteoff', (event) => {
          if (this.soundEngine && event.type === 'noteoff') {
            const transposedNote = event.note + this.transpose;
            this.soundEngine.noteOff(transposedNote);
            // 視覚的フィードバック用コールバック呼び出し（元のノート番号）
            this.onNoteOffCallback?.(event.note);
          }
        });

        // Control Change（サステインペダル等）
        this.midiManager.on('cc', (event) => {
          if (!this.soundEngine) return;
          if (event.type !== 'cc') return;

          switch (event.controller) {
            case MIDIControlChange.SustainPedal:
              // 64以上でペダルダウン、64未満でペダルアップ
              const isDown = event.value >= 64;
              this.soundEngine.setSustainPedal(isDown);
              // 視覚的フィードバック用コールバック呼び出し
              this.onSustainPedalCallback?.(isDown);
              break;

            case MIDIControlChange.AllNotesOff:
              this.soundEngine.allNotesOff();
              break;

            case MIDIControlChange.AllSoundOff:
              this.soundEngine.panic();
              break;
          }
        });

        this.state.midiEnabled = true;
        console.log('✅ MIDI enabled');
      } else {
        console.warn('⚠️ MIDI not available (will use keyboard/mouse input)');
      }
    } catch (error) {
      console.warn('⚠️ MIDI initialization failed:', error);
    }
  }

  /**
   * 手動でNote On（キーボード/マウス入力用）
   * 🔴 修正: AudioContext resume時のrace conditionを防止
   */
  async playNote(midiNote: number, velocity: number = 100): Promise<void> {
    if (!this.soundEngine) {
      throw new Error('AudioEngine not initialized');
    }

    // AudioContextをresumeする必要がある場合（race condition対策）
    if (this.audioContext?.state === 'suspended') {
      // 既にresume処理中の場合はそれを待つ
      if (!this.resumePromise) {
        this.resumePromise = this.audioContext.resume().then(() => {
          this.resumePromise = null;
        });
      }
      await this.resumePromise;
    }

    await this.soundEngine.noteOn(midiNote, velocity);
  }

  /**
   * 手動でNote Off
   */
  stopNote(midiNote: number): void {
    if (!this.soundEngine) {
      throw new Error('AudioEngine not initialized');
    }

    this.soundEngine.noteOff(midiNote);
  }

  /**
   * サステインペダル設定
   */
  setSustainPedal(isDown: boolean): void {
    if (!this.soundEngine) {
      throw new Error('AudioEngine not initialized');
    }

    this.soundEngine.setSustainPedal(isDown);
  }

  /**
   * 全ノート停止
   */
  allNotesOff(): void {
    this.soundEngine?.allNotesOff();
  }

  /**
   * パニック（即座停止）
   */
  panic(): void {
    this.soundEngine?.panic();
  }

  /**
   * 状態取得
   */
  getState(): AudioEngineState {
    if (this.soundEngine) {
      const stats = this.soundEngine.getStats();
      this.state.activeVoices = stats.activeVoices;
    }

    return { ...this.state };
  }

  /**
   * MIDI状態取得
   */
  getMIDIState() {
    return this.midiManager?.getState() || null;
  }

  /**
   * キャッシュ統計取得
   */
  getCacheStats() {
    return this.sampleManager?.getCacheStats() || null;
  }

  /**
   * サステイン中のノート一覧を取得
   */
  getSustainedNotes(): number[] {
    if (!this.soundEngine) return [];
    return this.soundEngine.getSustainedNotes();
  }

  /**
   * マスターボリュームを設定
   * @param volume - ボリューム（0-100）
   */
  setVolume(volume: number): void {
    if (!this.soundEngine) {
      throw new Error('AudioEngine not initialized');
    }
    this.soundEngine.setVolume(volume);
  }

  /**
   * トランスポーズを設定
   * @param transpose - 半音単位のトランスポーズ（-12 ~ +12）
   */
  setTranspose(transpose: number): void {
    this.transpose = Math.max(-12, Math.min(12, transpose));
  }

  /**
   * MIDIデバイスを選択
   * @param deviceId - デバイスID（null = All Devices）
   */
  selectMIDIDevice(deviceId: string | null): void {
    if (this.midiManager) {
      this.midiManager.selectDevice(deviceId);
    }
  }

  /**
   * クリーンアップ
   */
  dispose(): void {
    this.soundEngine?.panic();
    this.midiManager?.dispose();
    this.audioContext?.close();

    // ユーザーインタラクションリスナーをクリーンアップ
    if (this.userInteractionHandler) {
      document.removeEventListener('click', this.userInteractionHandler);
      document.removeEventListener('keydown', this.userInteractionHandler);
      document.removeEventListener('touchstart', this.userInteractionHandler);
      this.userInteractionHandler = null;
    }

    this.audioContext = null;
    this.sf2Data = null;
    this.sampleManager = null;
    this.soundEngine = null;
    this.midiManager = null;

    this.state.isReady = false;
  }
}
