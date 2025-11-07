/**
 * StereoManager - Stereo Sample Pair Playback
 *
 * L/R両サンプルの同時再生を管理:
 * - pan=-500（左チャンネル）とpan=+500（右チャンネル）の検出
 * - ChannelMergerによるステレオ合成
 * - 同期再生の保証
 */

import type { Zone, Sample } from '$lib/types/sf2.types';
import type { Voice } from '$lib/types/audio.types';
import { SampleManager } from './SampleManager';
import { PitchCalculator } from './PitchCalculator';

/**
 * ステレオ管理クラス
 */
export class StereoManager {
  private masterGain: GainNode;

  constructor(
    private audioContext: AudioContext,
    private sampleManager: SampleManager,
    private pitchCalculator: PitchCalculator,
    masterGain?: GainNode
  ) {
    // マスターゲインノードが渡されなければ作成
    this.masterGain = masterGain || audioContext.createGain();
    if (!masterGain) {
      this.masterGain.connect(audioContext.destination);
    }
  }

  /**
   * ステレオペアを再生
   *
   * @param midiNote - MIDI番号
   * @param velocity - ベロシティ（0-127）
   * @param zones - ゾーン配列（L/R両方を含む）
   * @returns Voice オブジェクト
   */
  async playStereoPair(midiNote: number, velocity: number, zones: Zone[]): Promise<Voice> {
    // L/R両方のゾーンを探す
    const leftZone = zones.find((z) => z.generators.pan === -500);
    const rightZone = zones.find((z) => z.generators.pan === 500);

    if (!leftZone || !rightZone) {
      throw new Error(
        `Stereo pair not found for MIDI ${midiNote} (L=${!!leftZone}, R=${!!rightZone})`
      );
    }

    if (leftZone.sampleId === undefined || rightZone.sampleId === undefined) {
      throw new Error(`Sample ID missing in stereo zones for MIDI ${midiNote}`);
    }

    // L/R両方のサンプルを読み込み
    const [leftBuffer, rightBuffer] = await Promise.all([
      this.sampleManager.loadSample(leftZone.sampleId),
      this.sampleManager.loadSample(rightZone.sampleId),
    ]);

    // L用ソース
    const leftSource = this.audioContext.createBufferSource();
    leftSource.buffer = leftBuffer;

    // R用ソース
    const rightSource = this.audioContext.createBufferSource();
    rightSource.buffer = rightBuffer;

    // ピッチ計算（L/R共通）
    const leftSample = this.sampleManager.getSampleData(leftZone.sampleId);
    if (!leftSample) {
      throw new Error(`Sample data ${leftZone.sampleId} not found`);
    }

    const playbackRate = this.pitchCalculator.calculatePlaybackRate(
      midiNote,
      leftSample,
      leftZone
    );
    leftSource.playbackRate.value = playbackRate;
    rightSource.playbackRate.value = playbackRate;

    // ループ設定（L/R共通）
    this.setupLoop(leftSource, leftSample);
    const rightSample = this.sampleManager.getSampleData(rightZone.sampleId);
    if (rightSample) {
      this.setupLoop(rightSource, rightSample);
    }

    // ゲイン（ベロシティ）
    const gain = this.audioContext.createGain();
    // ベロシティカーブ: 指数関数的（より自然な音量変化）
    gain.gain.value = Math.pow(velocity / 127, 2);

    // ChannelMergerでステレオ合成
    const merger = this.audioContext.createChannelMerger(2);
    leftSource.connect(merger, 0, 0); // 左チャンネル
    rightSource.connect(merger, 0, 1); // 右チャンネル
    merger.connect(gain);
    gain.connect(this.masterGain);

    // 両方同時に開始（同期保証）
    const startTime = this.audioContext.currentTime;
    leftSource.start(startTime);
    rightSource.start(startTime);

    // Voiceオブジェクトを返す
    return {
      id: Date.now() + Math.random(), // 簡易的なID生成
      midiNote,
      velocity,
      leftSource,
      rightSource,
      gainNode: gain,
      merger,
      startTime,
      isReleasing: false,
      zones, // ⭐ v2.1: リリース時間計算用
    };
  }

  /**
   * ループ設定
   *
   * 🔴 修正: ピアノサンプルはループさせない
   * ピアノは鍵盤を押したら1回だけ音が鳴り、自然減衰する
   */
  private setupLoop(source: AudioBufferSourceNode, sample: Sample): void {
    // ピアノサンプルはループさせない（常にfalse）
    source.loop = false;
  }

  /**
   * モノラル再生（ステレオペアが見つからない場合のフォールバック）
   */
  async playMono(midiNote: number, velocity: number, zone: Zone): Promise<Voice> {
    if (zone.sampleId === undefined) {
      throw new Error(`Sample ID missing in zone for MIDI ${midiNote}`);
    }

    // サンプルを読み込み
    const buffer = await this.sampleManager.loadSample(zone.sampleId);
    const sample = this.sampleManager.getSampleData(zone.sampleId);
    if (!sample) {
      throw new Error(`Sample data ${zone.sampleId} not found`);
    }

    // ソースを作成
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    // ピッチ計算
    const playbackRate = this.pitchCalculator.calculatePlaybackRate(midiNote, sample, zone);
    source.playbackRate.value = playbackRate;

    // ループ設定
    this.setupLoop(source, sample);

    // ゲイン
    const gain = this.audioContext.createGain();
    gain.gain.value = Math.pow(velocity / 127, 2);

    // モノラルなので直接接続
    source.connect(gain);
    gain.connect(this.audioContext.destination);

    // 再生開始
    const startTime = this.audioContext.currentTime;
    source.start(startTime);

    // Voiceオブジェクト（モノラル用に適応）
    return {
      id: Date.now() + Math.random(),
      midiNote,
      velocity,
      leftSource: source,
      rightSource: source, // モノラルなので同じソース
      gainNode: gain,
      merger: this.audioContext.createChannelMerger(2) as ChannelMergerNode, // ダミー
      startTime,
      isReleasing: false,
      zones: [zone],
    };
  }

  /**
   * ステレオペアが存在するか確認
   */
  hasStereoPair(zones: Zone[]): boolean {
    const hasLeft = zones.some((z) => z.generators.pan === -500);
    const hasRight = zones.some((z) => z.generators.pan === 500);
    return hasLeft && hasRight;
  }
}
