/**
 * SF2Parser - SoundFont 2 File Parser
 *
 * SF2ファイルのバイナリデータを解析し、サンプルとメタデータを抽出します。
 * RIFF構造に従い、INFO/SDTA/PDTAチャンクを解析します。
 */

import type {
  SF2Data,
  SF2Info,
  Sample,
  SampleHeader,
  Preset,
  Instrument,
  Zone,
  GeneratorMap,
  GeneratorType,
  Bag,
  ParseError,
} from '$lib/types/sf2.types';

export class SF2Parser {
  private view!: DataView;
  private offset: number = 0;

  /**
   * SF2ファイルを解析
   */
  parse(arrayBuffer: ArrayBuffer): SF2Data {
    this.view = new DataView(arrayBuffer);
    this.offset = 0;

    try {
      // RIFFヘッダー検証
      this.validateRIFF();

      // チャンク位置を特定
      const chunks = this.findChunks();

      // 各チャンクを解析
      const info = this.parseINFO(chunks.INFO);
      const samples = this.parseSDTA(chunks.SDTA);
      const { presets, instruments } = this.parsePDTA(chunks.PDTA, samples);

      return {
        info,
        samples,
        presets,
        instruments,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`SF2 Parse Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * RIFFヘッダー検証
   */
  private validateRIFF(): void {
    // 'RIFF' (0x52494646)
    const riff = this.readFourCC(0);
    if (riff !== 'RIFF') {
      throw new Error(`Invalid RIFF header: expected 'RIFF', got '${riff}'`);
    }

    // ファイルサイズ
    const fileSize = this.view.getUint32(4, true); // Little Endian

    // 'sfbk' (0x7366626B)
    const sfbk = this.readFourCC(8);
    if (sfbk !== 'sfbk') {
      throw new Error(`Invalid sfbk chunk: expected 'sfbk', got '${sfbk}'`);
    }

    this.offset = 12; // RIFFヘッダーの後
  }

  /**
   * 全チャンクの位置を特定
   */
  private findChunks(): { INFO: number; SDTA: number; PDTA: number } {
    const chunks = {
      INFO: -1,
      SDTA: -1,
      PDTA: -1,
    };

    let currentOffset = 12; // RIFFヘッダーの後

    while (currentOffset < this.view.byteLength - 8) {
      const listID = this.readFourCC(currentOffset);
      const listSize = this.view.getUint32(currentOffset + 4, true);
      const listType = this.readFourCC(currentOffset + 8);

      if (listID === 'LIST') {
        if (listType === 'INFO') chunks.INFO = currentOffset;
        else if (listType === 'sdta') chunks.SDTA = currentOffset;
        else if (listType === 'pdta') chunks.PDTA = currentOffset;
      }

      currentOffset += 8 + listSize;
    }

    if (chunks.INFO === -1) throw new Error('INFO chunk not found');
    if (chunks.SDTA === -1) throw new Error('SDTA chunk not found');
    if (chunks.PDTA === -1) throw new Error('PDTA chunk not found');

    return chunks;
  }

  /**
   * INFOチャンク解析
   */
  private parseINFO(offset: number): SF2Info {
    const info: SF2Info = {
      version: { major: 0, minor: 0 },
      soundEngine: '',
      bankName: '',
    };

    const listSize = this.view.getUint32(offset + 4, true);
    const endOffset = offset + 8 + listSize;
    let currentOffset = offset + 12; // 'LIST' + size + 'INFO'

    while (currentOffset < endOffset - 8) {
      const chunkID = this.readFourCC(currentOffset);
      const chunkSize = this.view.getUint32(currentOffset + 4, true);
      currentOffset += 8;

      switch (chunkID) {
        case 'ifil':
          info.version.major = this.view.getUint16(currentOffset, true);
          info.version.minor = this.view.getUint16(currentOffset + 2, true);
          break;
        case 'isng':
          info.soundEngine = this.readString(currentOffset, chunkSize);
          break;
        case 'INAM':
          info.bankName = this.readString(currentOffset, chunkSize);
          break;
        case 'irom':
          info.romName = this.readString(currentOffset, chunkSize);
          break;
        case 'iver':
          info.romVersion = {
            major: this.view.getUint16(currentOffset, true),
            minor: this.view.getUint16(currentOffset + 2, true),
          };
          break;
        case 'ICRD':
          info.creationDate = this.readString(currentOffset, chunkSize);
          break;
        case 'IENG':
          info.engineers = this.readString(currentOffset, chunkSize);
          break;
        case 'IPRD':
          info.product = this.readString(currentOffset, chunkSize);
          break;
        case 'ICOP':
          info.copyright = this.readString(currentOffset, chunkSize);
          break;
        case 'ICMT':
          info.comments = this.readString(currentOffset, chunkSize);
          break;
        case 'ISFT':
          info.software = this.readString(currentOffset, chunkSize);
          break;
      }

      currentOffset += chunkSize;
    }

    return info;
  }

  /**
   * SDTAチャンク解析（サンプルデータ）
   */
  private parseSDTA(offset: number): Sample[] {
    const listSize = this.view.getUint32(offset + 4, true);
    let currentOffset = offset + 12; // 'LIST' + size + 'sdta'

    const smplID = this.readFourCC(currentOffset);
    if (smplID !== 'smpl') {
      throw new Error(`Expected 'smpl' chunk, got '${smplID}'`);
    }

    const smplSize = this.view.getUint32(currentOffset + 4, true);
    currentOffset += 8;

    // サンプルデータを取得（Int16Array）
    const sampleData = new Int16Array(
      this.view.buffer,
      this.view.byteOffset + currentOffset,
      smplSize / 2
    );

    // サンプルデータは後でshdr情報と組み合わせる
    // ここでは空の配列を返し、PDTAで完成させる
    return [];
  }

  /**
   * PDTAチャンク解析（プリセット・インストゥルメント・サンプルヘッダー）
   */
  private parsePDTA(
    offset: number,
    samples: Sample[]
  ): { presets: Preset[]; instruments: Instrument[] } {
    const listSize = this.view.getUint32(offset + 4, true);
    const endOffset = offset + 8 + listSize;
    let currentOffset = offset + 12; // 'LIST' + size + 'pdta'

    // 各サブチャンクを格納
    const chunks: Record<string, { offset: number; size: number }> = {};

    while (currentOffset < endOffset - 8) {
      const chunkID = this.readFourCC(currentOffset);
      const chunkSize = this.view.getUint32(currentOffset + 4, true);

      chunks[chunkID] = { offset: currentOffset + 8, size: chunkSize };

      currentOffset += 8 + chunkSize;
    }

    // 必須チャンクの存在確認
    const requiredChunks = ['phdr', 'pbag', 'pgen', 'inst', 'ibag', 'igen', 'shdr'];
    for (const chunk of requiredChunks) {
      if (!chunks[chunk]) {
        throw new Error(`Required PDTA chunk '${chunk}' not found`);
      }
    }

    // shdr（サンプルヘッダー）を解析
    const sampleHeaders = this.parseSampleHeaders(chunks.shdr);

    // サンプルデータを完成させる
    const sdtaOffset = this.findChunks().SDTA;
    const smplDataOffset = sdtaOffset + 20; // LIST + size + sdta + smpl + size

    // 🔴 修正: Bounds checking追加（buffer overflow防止）
    const smplSize = this.view.getUint32(sdtaOffset + 16, true);
    const smplSampleCount = smplSize / 2;
    const bufferEnd = this.view.byteOffset + smplDataOffset + smplSize;

    if (bufferEnd > this.view.buffer.byteLength) {
      throw new Error(`Invalid SDTA chunk size: exceeds buffer bounds`);
    }

    const smplData = new Int16Array(
      this.view.buffer,
      this.view.byteOffset + smplDataOffset,
      smplSampleCount
    );

    for (let i = 0; i < sampleHeaders.length; i++) {
      const header = sampleHeaders[i];
      const start = header.start;
      const end = header.end;

      // 🔴 修正: サンプルインデックス検証（array bounds防止）
      if (start < 0 || end < 0 || start >= smplData.length || end > smplData.length || start >= end) {
        console.warn(`Sample ${i} (${header.name}): Invalid indices (start=${start}, end=${end}, max=${smplData.length})`);
        // 空のサンプルとして扱う
        samples.push({
          name: header.name || `Sample ${i}`,
          data: new Int16Array(0),
          header: {
            start: 0,
            end: 0,
            startLoop: 0,
            endLoop: 0,
            sampleRate: header.sampleRate || 44100,
            originalPitch: header.originalPitch || 60,
            pitchCorrection: 0,
          },
        });
        continue;
      }

      const data = smplData.slice(start, end);

      samples.push({
        name: header.name || `Sample ${i}`,
        data,
        header: {
          start: header.start,
          end: header.end,
          startLoop: header.startLoop,
          endLoop: header.endLoop,
          sampleRate: header.sampleRate,
          originalPitch: header.originalPitch,
          pitchCorrection: header.pitchCorrection,
        },
      });
    }

    // inst（インストゥルメント）を解析
    const instruments = this.parseInstruments(chunks.inst, chunks.ibag, chunks.igen);

    // phdr（プリセット）を解析
    const presets = this.parsePresets(
      chunks.phdr,
      chunks.pbag,
      chunks.pgen,
      instruments
    );

    return { presets, instruments };
  }

  /**
   * shdr（サンプルヘッダー）解析
   */
  private parseSampleHeaders(chunk: {
    offset: number;
    size: number;
  }): Array<SampleHeader & { name: string }> {
    const headers: Array<SampleHeader & { name: string }> = [];
    const count = chunk.size / 46; // 各shdrは46バイト

    for (let i = 0; i < count - 1; i++) {
      // 最後はターミネータなのでスキップ
      const offset = chunk.offset + i * 46;

      const name = this.readString(offset, 20);
      const start = this.view.getUint32(offset + 20, true);
      const end = this.view.getUint32(offset + 24, true);
      const startLoop = this.view.getUint32(offset + 28, true);
      const endLoop = this.view.getUint32(offset + 32, true);
      const sampleRate = this.view.getUint32(offset + 36, true);
      const originalPitch = this.view.getUint8(offset + 40);
      const pitchCorrection = this.view.getInt8(offset + 41);
      const sampleLink = this.view.getUint16(offset + 42, true);
      const sampleType = this.view.getUint16(offset + 44, true);

      headers.push({
        name,
        start,
        end,
        startLoop,
        endLoop,
        sampleRate,
        originalPitch,
        pitchCorrection,
        sampleLink,
        sampleType,
      });
    }

    return headers;
  }

  /**
   * inst（インストゥルメント）解析
   */
  private parseInstruments(
    instChunk: { offset: number; size: number },
    ibagChunk: { offset: number; size: number },
    igenChunk: { offset: number; size: number }
  ): Instrument[] {
    const instruments: Instrument[] = [];
    const instCount = instChunk.size / 22; // 各instは22バイト

    const bags = this.parseBags(ibagChunk);
    const generators = this.parseGenerators(igenChunk);

    for (let i = 0; i < instCount - 1; i++) {
      // 最後はターミネータ
      const offset = instChunk.offset + i * 22;
      const name = this.readString(offset, 20);
      const bagIndex = this.view.getUint16(offset + 20, true);
      const nextBagIndex =
        i < instCount - 2
          ? this.view.getUint16(instChunk.offset + (i + 1) * 22 + 20, true)
          : bags.length;

      const zones: Zone[] = [];

      for (let b = bagIndex; b < nextBagIndex; b++) {
        const bag = bags[b];
        const nextGenIndex = b < bags.length - 1 ? bags[b + 1].genIndex : generators.length;

        const zone = this.buildZone(generators.slice(bag.genIndex, nextGenIndex));
        zones.push(zone);
      }

      instruments.push({ name, zones });
    }

    return instruments;
  }

  /**
   * phdr（プリセット）解析
   */
  private parsePresets(
    phdrChunk: { offset: number; size: number },
    pbagChunk: { offset: number; size: number },
    pgenChunk: { offset: number; size: number },
    instruments: Instrument[]
  ): Preset[] {
    const presets: Preset[] = [];
    const presetCount = phdrChunk.size / 38; // 各phdrは38バイト

    const bags = this.parseBags(pbagChunk);
    const generators = this.parseGenerators(pgenChunk);

    for (let i = 0; i < presetCount - 1; i++) {
      // 最後はターミネータ
      const offset = phdrChunk.offset + i * 38;
      const name = this.readString(offset, 20);
      const preset = this.view.getUint16(offset + 20, true);
      const bank = this.view.getUint16(offset + 22, true);
      const bagIndex = this.view.getUint16(offset + 24, true);
      const library = this.view.getUint32(offset + 26, true);
      const genre = this.view.getUint32(offset + 30, true);
      const morphology = this.view.getUint32(offset + 34, true);

      const nextBagIndex =
        i < presetCount - 2
          ? this.view.getUint16(phdrChunk.offset + (i + 1) * 38 + 24, true)
          : bags.length;

      const zones: Zone[] = [];

      for (let b = bagIndex; b < nextBagIndex; b++) {
        const bag = bags[b];
        const nextGenIndex = b < bags.length - 1 ? bags[b + 1].genIndex : generators.length;

        const zone = this.buildZone(generators.slice(bag.genIndex, nextGenIndex));

        // プリセットゾーンの場合、instrumentIDを持つ
        // その場合、該当インストゥルメントの全ゾーンを展開
        if (zone.instrumentId !== undefined) {
          const instrument = instruments[zone.instrumentId];
          if (instrument) {
            zones.push(...instrument.zones);
          }
        } else {
          zones.push(zone);
        }
      }

      presets.push({
        name,
        preset,
        bank,
        library,
        genre,
        morphology,
        zones,
      });
    }

    return presets;
  }

  /**
   * バッグ解析
   */
  private parseBags(chunk: { offset: number; size: number }): Bag[] {
    const bags: Bag[] = [];
    const count = chunk.size / 4; // 各bagは4バイト

    for (let i = 0; i < count; i++) {
      const offset = chunk.offset + i * 4;
      bags.push({
        genIndex: this.view.getUint16(offset, true),
        modIndex: this.view.getUint16(offset + 2, true),
      });
    }

    return bags;
  }

  /**
   * ジェネレーター解析
   */
  private parseGenerators(chunk: {
    offset: number;
    size: number;
  }): Array<{ type: number; amount: number | { low: number; high: number } }> {
    const generators: Array<{ type: number; amount: number | { low: number; high: number } }> =
      [];
    const count = chunk.size / 4; // 各genは4バイト

    for (let i = 0; i < count; i++) {
      const offset = chunk.offset + i * 4;
      const type = this.view.getUint16(offset, true);
      const rawAmount = this.view.getUint16(offset + 2, true);

      // KeyRangeとVelRangeは範囲値
      if (type === 43 || type === 44) {
        generators.push({
          type,
          amount: {
            low: rawAmount & 0xff,
            high: (rawAmount >> 8) & 0xff,
          },
        });
      } else {
        // その他は符号付き16ビット整数
        const signedAmount = rawAmount > 32767 ? rawAmount - 65536 : rawAmount;
        generators.push({ type, amount: signedAmount });
      }
    }

    return generators;
  }

  /**
   * ジェネレーターからZoneを構築
   */
  private buildZone(
    generators: Array<{ type: number; amount: number | { low: number; high: number } }>
  ): Zone {
    const zone: Zone = {
      keyRange: { low: 0, high: 127 },
      velRange: { low: 0, high: 127 },
      generators: {},
    };

    for (const gen of generators) {
      switch (gen.type) {
        case 43: // KeyRange
          if (typeof gen.amount !== 'number') {
            zone.keyRange = gen.amount;
            zone.generators.keyRange = gen.amount;
          }
          break;
        case 44: // VelRange
          if (typeof gen.amount !== 'number') {
            zone.velRange = gen.amount;
            zone.generators.velRange = gen.amount;
          }
          break;
        case 17: // Pan
          if (typeof gen.amount === 'number') {
            zone.generators.pan = gen.amount;
          }
          break;
        case 52: // FineTune
          if (typeof gen.amount === 'number') {
            zone.generators.fineTune = gen.amount;
          }
          break;
        case 38: // ReleaseVolEnv
          if (typeof gen.amount === 'number') {
            zone.generators.releaseVolEnv = gen.amount;
          }
          break;
        case 53: // SampleID
          if (typeof gen.amount === 'number') {
            zone.sampleId = gen.amount;
            zone.generators.sampleID = gen.amount;
          }
          break;
        case 41: // Instrument
          if (typeof gen.amount === 'number') {
            zone.instrumentId = gen.amount;
          }
          break;
      }
    }

    return zone;
  }

  /**
   * FourCC（4文字コード）読み込み
   */
  private readFourCC(offset: number): string {
    return String.fromCharCode(
      this.view.getUint8(offset),
      this.view.getUint8(offset + 1),
      this.view.getUint8(offset + 2),
      this.view.getUint8(offset + 3)
    );
  }

  /**
   * NULL終端文字列読み込み
   */
  private readString(offset: number, maxLength: number): string {
    let str = '';
    for (let i = 0; i < maxLength; i++) {
      const char = this.view.getUint8(offset + i);
      if (char === 0) break;
      str += String.fromCharCode(char);
    }
    return str;
  }

  /**
   * 検証: 全サンプルが有効か
   */
  validate(sf2Data: SF2Data): boolean {
    if (sf2Data.samples.length === 0) {
      console.warn('No samples found in SF2 file');
      return false;
    }

    for (let i = 0; i < sf2Data.samples.length; i++) {
      const sample = sf2Data.samples[i];

      if (!sample.data || sample.data.length === 0) {
        console.warn(`Sample ${i} (${sample.name}): No data`);
        return false;
      }

      if (sample.header.sampleRate <= 0) {
        console.warn(`Sample ${i} (${sample.name}): Invalid sample rate`);
        return false;
      }
    }

    console.log(`✅ SF2 validation passed: ${sf2Data.samples.length} samples`);
    return true;
  }
}
