/**
 * SoundEngine - Main Audio Playback Engine
 *
 * 統合された音声再生エンジン:
 * - ベロシティレイヤー選択
 * - ステレオ再生
 * - ポリフォニー管理（最大64音）
 * - サステインペダル対応
 * - リリースエンベロープ（v2.1完全実装）
 */

import type { SF2Data, Zone } from '$lib/types/sf2.types';
import type { Voice } from '$lib/types/audio.types';
import { SampleManager } from './SampleManager';
import { StereoManager } from './StereoManager';
import { PitchCalculator } from './PitchCalculator';
import { EnvelopeCalculator } from './EnvelopeCalculator';

/**
 * SoundEngine設定
 */
export interface SoundEngineConfig {
  maxPolyphony?: number; // 最大ポリフォニー（デフォルト: 64）
}

/**
 * 音声再生エンジン
 */
export class SoundEngine {
  private audioContext: AudioContext;
  private sampleManager: SampleManager;
  private stereoManager: StereoManager;
  private envelopeCalculator: EnvelopeCalculator;
  private sf2Data: SF2Data;
  private voices: Map<number, Voice[]> = new Map();
  private sustainPedal = false;
  private sustainedNotes: Set<number> = new Set();
  private maxPolyphony: number;
  private masterGain: GainNode;

  constructor(
    audioContext: AudioContext,
    sampleManager: SampleManager,
    sf2Data: SF2Data,
    config: SoundEngineConfig = {}
  ) {
    this.audioContext = audioContext;
    this.sampleManager = sampleManager;
    this.sf2Data = sf2Data;
    this.maxPolyphony = config.maxPolyphony || 64;

    // マスターゲインノードを作成
    this.masterGain = audioContext.createGain();
    this.masterGain.connect(audioContext.destination);

    // 依存クラスを初期化
    const pitchCalculator = new PitchCalculator(audioContext);
    this.stereoManager = new StereoManager(audioContext, sampleManager, pitchCalculator, this.masterGain);
    this.envelopeCalculator = new EnvelopeCalculator();
  }

  /**
   * Note On処理
   */
  async noteOn(midiNote: number, velocity: number): Promise<void> {
    // MIDI番号範囲チェック（A0=21 ~ C8=108）
    if (midiNote < 21 || midiNote > 108) {
      console.warn(`MIDI note ${midiNote} out of range (21-108)`);
      return;
    }

    // ベロシティ範囲チェック
    if (velocity < 0 || velocity > 127) {
      console.warn(`Velocity ${velocity} out of range (0-127)`);
      return;
    }

    // AudioContextサスペンド確認
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // ベロシティレイヤー選択
    const zones = this.selectZones(midiNote, velocity);
    if (zones.length === 0) {
      console.warn(`No zones found for MIDI ${midiNote}, velocity ${velocity}`);
      return;
    }

    // 既存の同じMIDI番号のVoiceを停止
    const existingVoices = this.voices.get(midiNote);
    if (existingVoices && existingVoices.length > 0) {
      const now = this.audioContext.currentTime;
      const fadeOutTime = 0.02; // 20msでフェードアウト（クリックノイズ防止）

      // 配列のコピーをループ（ループ中に配列が変更されるため）
      for (const oldVoice of [...existingVoices]) {
        try {
          // 急速にフェードアウトさせてから停止
          oldVoice.gainNode.gain.cancelScheduledValues(now);
          oldVoice.gainNode.gain.setValueAtTime(oldVoice.gainNode.gain.value, now);
          oldVoice.gainNode.gain.linearRampToValueAtTime(0, now + fadeOutTime);

          // フェードアウト後に停止
          oldVoice.leftSource.stop(now + fadeOutTime);
          oldVoice.rightSource.stop(now + fadeOutTime);
        } catch (error) {
          // 既に停止している場合は無視
        }
        // ボイスはonendedで自動的に削除される
      }
    }

    // ポリフォニー制限チェック
    this.checkPolyphonyLimit();

    try {
      // ステレオペア再生
      const voice = await this.stereoManager.playStereoPair(midiNote, velocity, zones);

      // ボイス登録
      if (!this.voices.has(midiNote)) {
        this.voices.set(midiNote, []);
      }
      this.voices.get(midiNote)!.push(voice);

      // サステイン中ノートから削除（新しいNote Onなので）
      this.sustainedNotes.delete(midiNote);

      // 停止時のクリーンアップ
      voice.leftSource.onended = () => {
        this.removeVoice(voice);
      };
    } catch (error) {
      console.error(`Failed to play note ${midiNote}:`, error);
    }
  }

  /**
   * ベロシティレイヤー選択（16段階）
   */
  private selectZones(midiNote: number, velocity: number): Zone[] {
    if (this.sf2Data.presets.length === 0) {
      return [];
    }

    const preset = this.sf2Data.presets[0];
    const matchedZones: Zone[] = [];

    for (const zone of preset.zones) {
      const kr = zone.keyRange;
      const vr = zone.velRange;

      // キー範囲とベロシティ範囲の両方をチェック
      if (
        midiNote >= kr.low &&
        midiNote <= kr.high &&
        velocity >= vr.low &&
        velocity <= vr.high
      ) {
        matchedZones.push(zone);
      }
    }

    return matchedZones;
  }

  /**
   * Note Off処理
   */
  noteOff(midiNote: number): void {
    const noteVoices = this.voices.get(midiNote);
    if (!noteVoices || noteVoices.length === 0) {
      return;
    }

    // サステインペダルが押されている場合は保留
    if (this.sustainPedal) {
      this.sustainedNotes.add(midiNote);
      return;
    }

    this.releaseNote(midiNote);
  }

  /**
   * ノートリリース
   */
  private releaseNote(midiNote: number): void {
    const noteVoices = this.voices.get(midiNote);
    if (!noteVoices || noteVoices.length === 0) return;

    const currentTime = this.audioContext.currentTime;

    for (const voice of noteVoices) {
      if (voice.isReleasing) continue;

      voice.isReleasing = true;

      // リリース時間取得（v2.1で完全実装）
      const releaseTime = this.getReleaseTime(voice);

      // ⚠️ 改善: exponentialRampのedge case対応
      voice.gainNode.gain.cancelScheduledValues(currentTime);

      // 現在のゲイン値を取得（0や非常に小さい値の場合の対策）
      const currentGain = voice.gainNode.gain.value;
      const targetGain = 0.0001; // exponentialRampは0にできないので小さい値

      if (currentGain <= targetGain) {
        // すでに十分小さい場合は線形で即座にゼロへ
        voice.gainNode.gain.setValueAtTime(currentGain, currentTime);
        voice.gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.01);
      } else {
        // 通常ケース：指数関数的減衰
        voice.gainNode.gain.setValueAtTime(currentGain, currentTime);
        voice.gainNode.gain.exponentialRampToValueAtTime(targetGain, currentTime + releaseTime);
      }

      // 停止スケジュール（少し余裕を持たせる）
      voice.leftSource.stop(currentTime + releaseTime + 0.1);
      voice.rightSource.stop(currentTime + releaseTime + 0.1);
      voice.releaseTime = currentTime + releaseTime;
    }
  }

  /**
   * リリース時間計算（v2.1で完全実装）
   */
  private getReleaseTime(voice: Voice): number {
    // ⭐ v2.1修正: Voice.zonesから取得可能に
    if (voice.zones.length === 0) {
      return this.envelopeCalculator.calculateReleaseTime(undefined);
    }

    // 最初のゾーンのreleaseVolEnvを使用
    const releaseVolEnv = voice.zones[0]?.generators.releaseVolEnv;

    // EnvelopeCalculatorで変換
    return this.envelopeCalculator.calculateReleaseTime(releaseVolEnv);
  }

  /**
   * サステインペダル制御（CC64）
   */
  setSustainPedal(isDown: boolean): void {
    this.sustainPedal = isDown;

    // ペダルアップ時、サステイン中のノートをリリース
    if (!isDown) {
      for (const midiNote of this.sustainedNotes) {
        this.releaseNote(midiNote);
      }
      this.sustainedNotes.clear();
    }
  }

  /**
   * ポリフォニー制限チェック
   */
  private checkPolyphonyLimit(): void {
    let totalVoices = 0;
    for (const voices of this.voices.values()) {
      totalVoices += voices.length;
    }

    if (totalVoices >= this.maxPolyphony) {
      // 最も古いボイスを停止（ボイススティーリング）
      this.stealOldestVoice();
    }
  }

  /**
   * 最古のボイスを停止（ボイススティーリング）
   * ⚠️ 改善: より賢いアルゴリズム（リリース中 > 低ベロシティ > 古い順）
   */
  private stealOldestVoice(): void {
    let targetVoice: Voice | null = null;
    let lowestPriority = Infinity;

    for (const voices of this.voices.values()) {
      for (const voice of voices) {
        // 優先度計算（小さいほど優先的にスティール）
        let priority = 0;

        // 1. リリース中のボイスは優先的にスティール（-1000点）
        if (voice.isReleasing) {
          priority -= 1000;
        }

        // 2. ベロシティが低いほど優先的にスティール（-velocity点）
        priority -= voice.velocity;

        // 3. 古いボイスほど優先的にスティール（経過時間を加算）
        const age = this.audioContext.currentTime - voice.startTime;
        priority += age * 10; // 秒あたり10点

        if (priority < lowestPriority) {
          lowestPriority = priority;
          targetVoice = voice;
        }
      }
    }

    if (targetVoice) {
      try {
        targetVoice.leftSource.stop();
        targetVoice.rightSource.stop();
      } catch (error) {
        // すでに停止している場合はエラーを無視
      }
      this.removeVoice(targetVoice);
    }
  }

  /**
   * ボイス削除
   */
  private removeVoice(voice: Voice): void {
    // AudioNodeを切断（メモリリーク防止）
    try {
      voice.gainNode.disconnect();
      voice.merger.disconnect();
    } catch (error) {
      // 既に切断されている場合は無視
    }

    for (const [midiNote, voices] of this.voices.entries()) {
      const index = voices.indexOf(voice);
      if (index >= 0) {
        voices.splice(index, 1);
        if (voices.length === 0) {
          this.voices.delete(midiNote);
          // sustainedNotesとの整合性を保つ
          this.sustainedNotes.delete(midiNote);
        }
        break;
      }
    }
  }

  /**
   * 全ノート停止
   */
  allNotesOff(): void {
    for (const midiNote of this.voices.keys()) {
      this.releaseNote(midiNote);
    }
    this.sustainedNotes.clear();
  }

  /**
   * 全ノート即座停止（パニック）
   */
  panic(): void {
    for (const voices of this.voices.values()) {
      for (const voice of voices) {
        try {
          voice.leftSource.stop();
          voice.rightSource.stop();
        } catch (error) {
          // すでに停止している場合はエラーを無視
        }
      }
    }
    this.voices.clear();
    this.sustainedNotes.clear();
  }

  /**
   * 統計情報取得
   */
  getStats(): {
    activeVoices: number;
    sustainedNotes: number;
    sustainPedalDown: boolean;
    maxPolyphony: number;
  } {
    let activeVoices = 0;
    for (const voices of this.voices.values()) {
      activeVoices += voices.length;
    }

    return {
      activeVoices,
      sustainedNotes: this.sustainedNotes.size,
      sustainPedalDown: this.sustainPedal,
      maxPolyphony: this.maxPolyphony,
    };
  }

  /**
   * サステイン中のノート一覧を取得
   * UI層がサステイン中の鍵盤の視覚的状態を管理するために使用
   */
  getSustainedNotes(): number[] {
    return Array.from(this.sustainedNotes);
  }

  /**
   * マスターボリュームを設定
   * @param volume - ボリューム（0-100）
   */
  setVolume(volume: number): void {
    const normalizedVolume = Math.max(0, Math.min(100, volume)) / 100;
    this.masterGain.gain.value = normalizedVolume;
  }
}
