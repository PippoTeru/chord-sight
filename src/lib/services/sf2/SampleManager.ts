/**
 * SampleManager - Audio Sample Management with LRU Cache
 *
 * 960個のサンプルを効率的に管理:
 * - Int16Array → AudioBuffer変換
 * - LRUキャッシュ（最大100-200サンプル）
 * - オンデマンドロード
 * - メモリ使用量監視
 */

import type { Sample, SF2Data } from '$lib/types/sf2.types';

/**
 * LRUキャッシュエントリ
 */
interface CacheEntry {
  buffer: AudioBuffer;
  lastAccessed: number;
  size: number; // バイト数
}

/**
 * SampleManager設定
 */
export interface SampleManagerConfig {
  maxCacheSize?: number; // 最大キャッシュサイズ（デフォルト: 150）
  audioContext: AudioContext;
}

/**
 * サンプル管理クラス
 */
export class SampleManager {
  private audioContext: AudioContext;
  private sf2Data: SF2Data;
  private cache: Map<number, CacheEntry> = new Map();
  private maxCacheSize: number;
  private totalMemoryUsage: number = 0;

  constructor(sf2Data: SF2Data, config: SampleManagerConfig) {
    this.sf2Data = sf2Data;
    this.audioContext = config.audioContext;
    this.maxCacheSize = config.maxCacheSize || 150;
  }

  /**
   * サンプルをAudioBufferとして取得（キャッシュ付き）
   */
  async loadSample(sampleId: number): Promise<AudioBuffer> {
    // キャッシュにあればそれを返す
    const cached = this.cache.get(sampleId);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.buffer;
    }

    // キャッシュにない場合は新規作成
    const sample = this.getSampleData(sampleId);
    if (!sample) {
      throw new Error(`Sample ${sampleId} not found`);
    }

    const buffer = await this.createAudioBuffer(sample);

    // キャッシュに追加
    this.addToCache(sampleId, buffer);

    return buffer;
  }

  /**
   * キャッシュからサンプルを取得（同期版）
   */
  getSample(sampleId: number): AudioBuffer | null {
    const cached = this.cache.get(sampleId);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.buffer;
    }
    return null;
  }

  /**
   * 生のサンプルデータを取得
   */
  getSampleData(sampleId: number): Sample | null {
    if (sampleId < 0 || sampleId >= this.sf2Data.samples.length) {
      return null;
    }
    return this.sf2Data.samples[sampleId];
  }

  /**
   * Int16Array → AudioBuffer変換
   */
  private async createAudioBuffer(sample: Sample): Promise<AudioBuffer> {
    const sampleRate = sample.header.sampleRate;
    const length = sample.data.length;

    // AudioBufferを作成（モノラル）
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Int16 (-32768 ~ 32767) → Float32 (-1.0 ~ 1.0) 変換
    for (let i = 0; i < length; i++) {
      channelData[i] = sample.data[i] / 32768.0;
    }

    return buffer;
  }

  /**
   * キャッシュに追加（LRU管理）
   */
  private addToCache(sampleId: number, buffer: AudioBuffer): void {
    // サイズ計算（バイト数）
    const size = buffer.length * buffer.numberOfChannels * 4; // Float32 = 4 bytes

    // キャッシュが満杯なら古いものを削除
    while (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }

    // 新しいエントリを追加
    this.cache.set(sampleId, {
      buffer,
      lastAccessed: Date.now(),
      size,
    });

    this.totalMemoryUsage += size;
  }

  /**
   * LRU: 最も古いエントリを削除
   */
  private evictLRU(): void {
    let oldestId: number | null = null;
    let oldestTime = Infinity;

    for (const [id, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestId = id;
      }
    }

    if (oldestId !== null) {
      const entry = this.cache.get(oldestId)!;
      this.totalMemoryUsage -= entry.size;
      this.cache.delete(oldestId);
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.totalMemoryUsage = 0;
  }

  /**
   * メモリ使用量を取得（MB）
   */
  getMemoryUsage(): number {
    return this.totalMemoryUsage / (1024 * 1024);
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    memoryUsageMB: number;
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      memoryUsageMB: this.getMemoryUsage(),
    };
  }

  /**
   * 特定のサンプルをプリロード
   */
  async preloadSamples(sampleIds: number[]): Promise<void> {
    const promises = sampleIds.map((id) => this.loadSample(id));
    await Promise.all(promises);
  }

  /**
   * MIDI番号に対応するサンプルをプリロード
   */
  async preloadForMIDIRange(midiStart: number, midiEnd: number): Promise<void> {
    const sampleIds = new Set<number>();

    // 最初のプリセットから該当範囲のサンプルIDを収集
    if (this.sf2Data.presets.length > 0) {
      const preset = this.sf2Data.presets[0];

      for (const zone of preset.zones) {
        // MIDI範囲とベロシティ範囲をチェック
        const keyRange = zone.keyRange;
        if (
          keyRange.low <= midiEnd &&
          keyRange.high >= midiStart &&
          zone.sampleId !== undefined
        ) {
          sampleIds.add(zone.sampleId);
        }
      }
    }

    console.log(
      `Preloading ${sampleIds.size} samples for MIDI range ${midiStart}-${midiEnd}...`
    );
    await this.preloadSamples(Array.from(sampleIds));
  }
}
