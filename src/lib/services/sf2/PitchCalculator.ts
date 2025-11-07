/**
 * PitchCalculator - Accurate Pitch Calculation for SF2 Playback
 *
 * playbackRateを正確に計算します（v2.1修正版）:
 * - MIDI音番号からのピッチ変換
 * - サンプルの元ピッチ補正
 * - fineTune適用
 * - サンプルレート補正（v2.1で修正）
 */

import type { Sample, Zone } from '$lib/types/sf2.types';

/**
 * ピッチ計算クラス
 */
export class PitchCalculator {
  constructor(private audioContext: AudioContext) {}

  /**
   * playbackRateを計算
   *
   * 公式: playbackRate = 2^(totalCents / 1200) * (sampleRate / contextRate)
   * totalCents = (midiNote - originalPitch) * 100 + pitchCorrection + fineTune
   *
   * @param midiNote - 再生するMIDI番号
   * @param sample - サンプルデータ
   * @param zone - ゾーン情報（fineTuneを含む）
   * @returns playbackRate値
   */
  calculatePlaybackRate(midiNote: number, sample: Sample, zone: Zone): number {
    // 1. サンプルの基準ピッチ（MIDI番号）
    const originalPitch = sample.header.originalPitch;

    // 2. サンプルのピッチ補正（セント単位、-99 ~ +99）
    const pitchCorrection = sample.header.pitchCorrection;

    // 3. ゾーンのfineTune（セント単位）
    const fineTune = zone.generators.fineTune || 0;

    // 4. 半音の差（MIDI番号の差）
    const semitoneDiff = midiNote - originalPitch;

    // 5. セント単位の合計（1半音 = 100セント）
    const totalCents = semitoneDiff * 100 + pitchCorrection + fineTune;

    // 6. playbackRate計算（セントから比率へ）
    // 2^(cents/1200) で計算
    let playbackRate = Math.pow(2, totalCents / 1200);

    // 7. サンプルレート補正（v2.1で修正）
    playbackRate = this.adjustForSampleRate(
      playbackRate,
      sample.header.sampleRate,
      this.audioContext.sampleRate
    );

    return playbackRate;
  }

  /**
   * サンプルレート補正（v2.1で修正）
   *
   * SF2サンプルレート（例: 48000Hz）と
   * AudioContextのサンプルレート（例: 44100Hz）が異なる場合の補正
   *
   * ⭐ v2.1修正: 計算式が逆だった
   * v2.0（誤り）: const rateFactor = contextRate / sampleRate;
   * v2.1（正解）: const rateFactor = sampleRate / contextRate;
   *
   * 理由:
   * - SF2が48000Hzでサンプリング、AudioContextが44100Hzで再生
   * - 1秒のサンプルを再生すると、48000/44100 ≈ 1.088倍速になる
   * - そのため、playbackRateを1.088倍にして補正する必要がある
   */
  private adjustForSampleRate(
    playbackRate: number,
    sampleRate: number,
    contextRate: number
  ): number {
    if (sampleRate === contextRate) {
      return playbackRate;
    }

    // ⭐ v2.1修正: 正しい計算式
    const rateFactor = sampleRate / contextRate;

    // 例: SF2=48000Hz, Context=44100Hz
    // rateFactor = 48000 / 44100 = 1.08844
    // → 再生速度を上げて補正

    return playbackRate * rateFactor;
  }

  /**
   * MIDI番号から周波数を計算（検証用）
   *
   * A4 (MIDI 69) = 440 Hz
   * 公式: frequency = 440 * 2^((midiNote - 69) / 12)
   */
  midiToFrequency(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  /**
   * playbackRateから実際の再生周波数を計算（検証用）
   */
  playbackRateToFrequency(
    playbackRate: number,
    originalPitch: number,
    sampleRate: number
  ): number {
    const originalFreq = this.midiToFrequency(originalPitch);
    return originalFreq * playbackRate;
  }

  /**
   * デバッグ用: セント計算の詳細を出力
   */
  debugPitchCalculation(midiNote: number, sample: Sample, zone: Zone): void {
    const originalPitch = sample.header.originalPitch;
    const pitchCorrection = sample.header.pitchCorrection;
    const fineTune = zone.generators.fineTune || 0;
    const semitoneDiff = midiNote - originalPitch;
    const totalCents = semitoneDiff * 100 + pitchCorrection + fineTune;
    const baseRate = Math.pow(2, totalCents / 1200);
    const rateFactor = sample.header.sampleRate / this.audioContext.sampleRate;
    const finalRate = baseRate * rateFactor;

    const targetFreq = this.midiToFrequency(midiNote);
    const actualFreq = this.playbackRateToFrequency(
      finalRate,
      originalPitch,
      sample.header.sampleRate
    );

    console.log('Pitch Calculation:', {
      midiNote,
      targetFrequency: targetFreq.toFixed(2) + ' Hz',
      originalPitch,
      semitoneDiff,
      pitchCorrection: pitchCorrection + ' cents',
      fineTune: fineTune + ' cents',
      totalCents: totalCents + ' cents',
      baseRate: baseRate.toFixed(6),
      sampleRate: sample.header.sampleRate + ' Hz',
      contextRate: this.audioContext.sampleRate + ' Hz',
      rateFactor: rateFactor.toFixed(6),
      finalRate: finalRate.toFixed(6),
      actualFrequency: actualFreq.toFixed(2) + ' Hz',
      error: (actualFreq - targetFreq).toFixed(2) + ' Hz',
    });
  }

  /**
   * ピッチ精度を検証（±5セント以内か）
   */
  validatePitchAccuracy(midiNote: number, sample: Sample, zone: Zone): boolean {
    const playbackRate = this.calculatePlaybackRate(midiNote, sample, zone);
    const targetFreq = this.midiToFrequency(midiNote);
    const actualFreq = this.playbackRateToFrequency(
      playbackRate,
      sample.header.originalPitch,
      sample.header.sampleRate
    );

    // 周波数差をセントに変換
    const centError = 1200 * Math.log2(actualFreq / targetFreq);

    return Math.abs(centError) <= 5; // ±5セント以内
  }
}
