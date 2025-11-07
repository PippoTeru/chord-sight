/**
 * SF2 (SoundFont 2) Type Definitions
 *
 * SalamanderGrandPiano-V3で使用する6種類のジェネレーターに対応
 */

/**
 * SF2ファイル全体のデータ構造
 */
export interface SF2Data {
  info: SF2Info;
  samples: Sample[];
  presets: Preset[];
  instruments: Instrument[];
}

/**
 * SF2ファイル情報（INFOチャンク）
 */
export interface SF2Info {
  version: { major: number; minor: number };
  soundEngine: string;
  bankName: string;
  romName?: string;
  romVersion?: { major: number; minor: number };
  creationDate?: string;
  engineers?: string;
  product?: string;
  copyright?: string;
  comments?: string;
  software?: string;
}

/**
 * サンプルデータ
 */
export interface Sample {
  name: string;
  data: Int16Array;        // 16-bit PCM
  header: SampleHeader;
}

/**
 * サンプルヘッダー（shdr構造体）
 */
export interface SampleHeader {
  start: number;           // サンプル開始点
  end: number;             // サンプル終了点
  startLoop: number;       // ループ開始点
  endLoop: number;         // ループ終了点
  sampleRate: number;      // サンプルレート（48000 Hz）
  originalPitch: number;   // オリジナルキー（MIDI番号）
  pitchCorrection: number; // ピッチ補正（セント、-99 ~ +99）
  sampleLink: number;      // リンクサンプルID
  sampleType: SampleType;  // サンプルタイプ
}

/**
 * サンプルタイプ
 */
export enum SampleType {
  MonoSample = 1,
  RightSample = 2,
  LeftSample = 4,
  LinkedSample = 8,
  RomMonoSample = 0x8001,
  RomRightSample = 0x8002,
  RomLeftSample = 0x8004,
  RomLinkedSample = 0x8008,
}

/**
 * プリセット
 */
export interface Preset {
  name: string;
  preset: number;          // プリセット番号（0-127）
  bank: number;            // バンク番号（0-16383）
  library: number;
  genre: number;
  morphology: number;
  zones: Zone[];
}

/**
 * インストゥルメント
 */
export interface Instrument {
  name: string;
  zones: Zone[];
}

/**
 * ゾーン（キー・ベロシティ範囲とジェネレーター）
 */
export interface Zone {
  keyRange: { low: number; high: number };
  velRange: { low: number; high: number };
  generators: GeneratorMap;
  sampleId?: number;
  instrumentId?: number;   // プリセットゾーンの場合
}

/**
 * ジェネレーターマップ
 * SalamanderGrandPianoで使用する6種類のジェネレーター
 */
export interface GeneratorMap {
  // キー・ベロシティ範囲
  keyRange?: { low: number; high: number };      // 43
  velRange?: { low: number; high: number };      // 44

  // サンプル選択
  sampleID?: number;                              // 53

  // ステレオ配置（-500=L, +500=R）
  pan?: number;                                   // 17

  // ピッチ調整（セント単位）
  fineTune?: number;                              // 52

  // リリース時間（Timecents単位）
  releaseVolEnv?: number;                         // 38
}

/**
 * ジェネレーター列挙型
 */
export enum GeneratorType {
  StartAddrsOffset = 0,
  EndAddrsOffset = 1,
  StartloopAddrsOffset = 2,
  EndloopAddrsOffset = 3,
  StartAddrsCoarseOffset = 4,
  ModLfoToPitch = 5,
  VibLfoToPitch = 6,
  ModEnvToPitch = 7,
  InitialFilterFc = 8,
  InitialFilterQ = 9,
  ModLfoToFilterFc = 10,
  ModEnvToFilterFc = 11,
  EndAddrsCoarseOffset = 12,
  ModLfoToVolume = 13,
  Unused1 = 14,
  ChorusEffectsSend = 15,
  ReverbEffectsSend = 16,
  Pan = 17,                   // ⭐ 使用
  Unused2 = 18,
  Unused3 = 19,
  Unused4 = 20,
  DelayModLFO = 21,
  FreqModLFO = 22,
  DelayVibLFO = 23,
  FreqVibLFO = 24,
  DelayModEnv = 25,
  AttackModEnv = 26,
  HoldModEnv = 27,
  DecayModEnv = 28,
  SustainModEnv = 29,
  ReleaseModEnv = 30,
  KeynumToModEnvHold = 31,
  KeynumToModEnvDecay = 32,
  DelayVolEnv = 33,
  AttackVolEnv = 34,
  HoldVolEnv = 35,
  DecayVolEnv = 36,
  SustainVolEnv = 37,
  ReleaseVolEnv = 38,         // ⭐ 使用
  KeynumToVolEnvHold = 39,
  KeynumToVolEnvDecay = 40,
  Instrument = 41,
  Reserved1 = 42,
  KeyRange = 43,              // ⭐ 使用
  VelRange = 44,              // ⭐ 使用
  StartloopAddrsCoarseOffset = 45,
  Keynum = 46,
  Velocity = 47,
  InitialAttenuation = 48,
  Reserved2 = 49,
  EndloopAddrsCoarseOffset = 50,
  CoarseTune = 51,
  FineTune = 52,              // ⭐ 使用
  SampleID = 53,              // ⭐ 使用
  SampleModes = 54,
  Reserved3 = 55,
  ScaleTuning = 56,
  ExclusiveClass = 57,
  OverridingRootKey = 58,
  Unused5 = 59,
  EndOper = 60,
}

/**
 * ジェネレーター値の構造
 */
export interface Generator {
  type: GeneratorType;
  value: number | { low: number; high: number };
}

/**
 * バッグ（ゾーンのインデックス範囲）
 */
export interface Bag {
  genIndex: number;
  modIndex: number;
}

/**
 * パース中のエラー情報
 */
export interface ParseError {
  message: string;
  offset?: number;
  chunk?: string;
}
