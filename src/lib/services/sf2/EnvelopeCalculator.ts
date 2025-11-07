/**
 * EnvelopeCalculator - SF2 Envelope Time Conversion
 *
 * Timecents（SF2の時間単位）を秒に変換します。
 * SF2仕様: Time = 2^(Timecents / 1200)
 */

/**
 * エンベロープ計算クラス
 */
export class EnvelopeCalculator {
  /**
   * Timecentsを秒に変換
   *
   * SF2仕様: Time = 2^(Timecents / 1200)
   *
   * 例:
   * - 0 Timecents = 2^0 = 1秒
   * - 1200 Timecents = 2^1 = 2秒
   * - -1200 Timecents = 2^-1 = 0.5秒
   * - 3600 Timecents = 2^3 = 8秒
   * - -2400 Timecents = 2^-2 = 0.25秒
   */
  timecentsToSeconds(timecents: number): number {
    return Math.pow(2, timecents / 1200);
  }

  /**
   * リリース時間を計算
   *
   * @param releaseVolEnv - SF2のreleaseVolEnvジェネレーター値（Timecents）
   * @returns リリース時間（秒）
   */
  calculateReleaseTime(releaseVolEnv: number | undefined): number {
    if (releaseVolEnv === undefined) {
      // デフォルト: 200ms（クリックノイズ防止のため少し長め）
      return 0.2;
    }

    const releaseTime = this.timecentsToSeconds(releaseVolEnv);

    // 安全性チェック: 極端な値を制限
    if (releaseTime < 0.01) return 0.01;  // 最小10ms（クリックノイズ防止）
    if (releaseTime > 10) return 10;       // 最大10秒

    return releaseTime;
  }

  /**
   * アタック時間を計算
   */
  calculateAttackTime(attackVolEnv: number | undefined): number {
    if (attackVolEnv === undefined) {
      return 0.001; // デフォルト: 1ms（即座）
    }

    const attackTime = this.timecentsToSeconds(attackVolEnv);

    // 安全性チェック
    if (attackTime < 0.001) return 0.001;
    if (attackTime > 5) return 5;

    return attackTime;
  }

  /**
   * ホールド時間を計算
   */
  calculateHoldTime(holdVolEnv: number | undefined): number {
    if (holdVolEnv === undefined) {
      return 0; // デフォルト: ホールドなし
    }

    const holdTime = this.timecentsToSeconds(holdVolEnv);

    // 安全性チェック
    if (holdTime < 0) return 0;
    if (holdTime > 5) return 5;

    return holdTime;
  }

  /**
   * ディケイ時間を計算
   */
  calculateDecayTime(decayVolEnv: number | undefined): number {
    if (decayVolEnv === undefined) {
      return 0.1; // デフォルト: 100ms
    }

    const decayTime = this.timecentsToSeconds(decayVolEnv);

    // 安全性チェック
    if (decayTime < 0.001) return 0.001;
    if (decayTime > 10) return 10;

    return decayTime;
  }

  /**
   * デバッグ用: Timecents変換の詳細を出力
   */
  debugTimecentsConversion(timecents: number): void {
    const seconds = this.timecentsToSeconds(timecents);
    console.log('Timecents Conversion:', {
      timecents,
      seconds,
      milliseconds: seconds * 1000,
      formula: `2^(${timecents}/1200) = ${seconds.toFixed(6)}`,
    });
  }

  /**
   * 一般的なTimecents値のプリセット
   */
  static readonly PRESETS = {
    INSTANT: -12000,      // ~0.001秒
    VERY_FAST: -7200,     // ~0.016秒
    FAST: -4800,          // ~0.063秒
    MEDIUM: -1200,        // 0.5秒
    SLOW: 0,              // 1秒
    VERY_SLOW: 1200,      // 2秒
    EXTREMELY_SLOW: 3600, // 8秒
  };
}
