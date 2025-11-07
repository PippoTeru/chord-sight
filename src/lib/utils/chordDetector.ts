// コード検出メイン処理
// chord-detection-spec-v3.md に基づく実装

import { getStandardChordMap, chord2num, num2chord, getNum2Chord, type ChordMap } from './chordMaps';
import { generateChordList, generateChordListWithOmit } from './chordGenerator';
import { selectBestChordName, groupCandidatesByScore } from './chordScoring';
import { mergeParentheses, convertToMNotoSans } from './mNotoConverter';
import { settings } from '$lib/stores/settings.svelte';

// 生成されたコードマップをキャッシュ
let generatedChordMap: ChordMap | null = null;
let generatedChordMapWithOmit: ChordMap | null = null;

/**
 * MIDI番号のセットからコード名を検出（通常形式）
 * テスト用：MNoto Sans変換前の通常形式を返す（括弧統合なし）
 */
export function detectChordRaw(midiNumbers: Set<number>): string {
  if (midiNumbers.size === 0) return "";

  // 1. MIDI番号をソートして、最低音を取得
  const sortedMidi = Array.from(midiNumbers).sort((a, b) => a - b);
  const lowestMidi = sortedMidi[0];
  const lowestNoteName = num2chord[lowestMidi % 12];

  // 2. ピッチクラスに正規化（ソート）
  const pitchClasses = normalizeToPitchClasses(midiNumbers);

  // 3. コード検出（通常形式）
  const candidates = findChordCandidates(pitchClasses, lowestNoteName);

  if (candidates.length === 0) {
    return ""; // コードが見つからない場合は何も表示しない
  }

  // 4. スコアリング（通常形式）
  let bestChords = selectBestChordName(candidates);

  // テスト用：括弧統合なし、かつ全ての(-5)の括弧を外す
  let result = bestChords[0];
  // 元の実装に合わせて、(-5) → -5 に変換
  result = result.replace(/\(-5\)/g, '-5');
  return result;
}

/**
 * MIDI番号のセットからコード名を検出（候補を複数返す）
 * スコアが同じものは全て列挙する
 */
export function detectChordWithCandidates(midiNumbers: Set<number>): string[] {
  if (midiNumbers.size === 0) return [];

  // 設定に応じた音名変換マップを取得
  const useFlat = settings.accidentalNotation === 'flat';
  const num2chordMap = getNum2Chord(useFlat);

  // 1. MIDI番号をソートして、最低音を取得
  const sortedMidi = Array.from(midiNumbers).sort((a, b) => a - b);
  const lowestMidi = sortedMidi[0];
  const lowestNoteName = num2chordMap[lowestMidi % 12];

  // 2. ピッチクラスに正規化（ソート）
  const pitchClasses = normalizeToPitchClasses(midiNumbers, num2chordMap);

  // 1音の場合は何も表示しない
  if (pitchClasses.length === 1) {
    return [];
  }

  // 2音の場合はパワーコード（5th）のみ表示
  if (pitchClasses.length === 2) {
    const intervals = toIntervals(pitchClasses);
    // パワーコード (0,7) のみ表示、それ以外は空文字
    if (intervals.join(',') === '0,7') {
      const chord = pitchClasses[0] + '5';
      return [convertToMNotoSans(chord)];
    }
    return []; // パワーコード以外は表示しない
  }

  // 3. コード検出（通常形式）
  const candidates = findChordCandidates(pitchClasses, lowestNoteName);

  if (candidates.length === 0) {
    return []; // コードが見つからない場合は何も表示しない
  }

  // 4. スコアリング（スコアごとにグループ化）
  const groups = groupCandidatesByScore(candidates);

  // 5. 第1位のグループのみ処理（括弧統合 & MNoto Sans変換）
  const result: string[] = [];
  if (groups.length > 0) {
    const topGroup = groups[0];
    for (const chordName of topGroup) {
      const mergedChord = mergeParentheses(chordName);
      const mNotoChord = convertToMNotoSans(mergedChord);
      result.push(mNotoChord);
    }
  }

  return result;
}

/**
 * MIDI番号のセットからコード名を検出（第1候補のみ）
 */
export function detectChord(midiNumbers: Set<number>): string {
  const candidates = detectChordWithCandidates(midiNumbers);
  return candidates.length > 0 ? candidates[0] : "";
}

/**
 * MIDI番号をピッチクラス（音名）に正規化
 * 最低音を基準にした順序で並べる
 */
function normalizeToPitchClasses(midiNumbers: Set<number>, num2chordMap: Record<number, string>): string[] {
  // MIDI番号をソート
  const sortedMidi = Array.from(midiNumbers).sort((a, b) => a - b);

  // 最低音のピッチクラスを取得
  const lowestPc = sortedMidi[0] % 12;

  // ピッチクラスに変換（重複除去）
  const uniquePitchClasses: number[] = [];
  const seen = new Set<number>();

  for (const midi of sortedMidi) {
    const pc = midi % 12;
    if (!seen.has(pc)) {
      uniquePitchClasses.push(pc);
      seen.add(pc);
    }
  }

  // 最低音を基準に並べ替え（クロマチックな順序）
  const sorted = uniquePitchClasses.sort((a, b) => {
    const aDistance = (a - lowestPc + 12) % 12;
    const bDistance = (b - lowestPc + 12) % 12;
    return aDistance - bDistance;
  });

  // 音名に変換
  return sorted.map(pc => num2chordMap[pc]);
}

/**
 * コード候補を検索
 * 元のchord_finder.jsのtoChords関数を完全コピー
 */
function findChordCandidates(pitchClasses: string[], lowestNoteName: string): string[] {
  const candidates: string[] = [];

  // 3種類のマップで検索（元の実装に合わせてstandard → generated1 → generated2の順）
  const standardMap = getStandardChordMap();
  const generatedMap = getGeneratedChordMap();
  const generatedMapWithOmit = getGeneratedChordMapWithOmit();

  const maps: [ChordMap, string][] = [
    [standardMap, 'standard'],
    [generatedMap, 'generated1'],
    [generatedMapWithOmit, 'generated2'],
  ];

  for (const [chordMap, mapType] of maps) {
    // 1. そのまま検索（判定）
    const r1 = find(pitchClasses, chordMap);
    if (r1 !== null) {
      const results = Array.isArray(r1) ? r1 : [r1];
      candidates.push(...results);
    }

    // 2. ベース音をとって転回判定
    // if(true || res == null || map_type == "generated2")
    if (true) {
      const tmpChordAry = pitchClasses.slice(1); // shift相当

      // 2-1. ベース音を除いて検索
      const r2 = find(tmpChordAry, chordMap);
      if (r2 !== null) {
        const results = Array.isArray(r2) ? r2 : [r2];
        for (const chord of results) {
          candidates.push(createSlashChord(chord, lowestNoteName));
        }
      }

      // 2-2. ベース音を除いて回転検索
      const r3 = findWithRotate(tmpChordAry, lowestNoteName, chordMap);
      candidates.push(...r3);
    }

    // 3. ベース音ありで転回判定
    // if(true || res == null || map_type == "generated2")
    if (true) {
      const r4 = findWithRotate(pitchClasses, lowestNoteName, chordMap);
      candidates.push(...r4);
    }
  }

  // 重複除去
  return Array.from(new Set(candidates));
}

/**
 * 音名配列からコード名を検索
 */
function find(noteNames: string[], chordMap: ChordMap): string | string[] | null {
  // 相対値化（ルートからの半音数）
  const intervals = toIntervals(noteNames);

  // マップから検索
  const key = intervals.join(',');
  const chordSuffix = chordMap[key];

  if (chordSuffix !== undefined) {
    // 配列の場合は、各要素にルート音を追加
    if (Array.isArray(chordSuffix)) {
      return chordSuffix.map(suffix => noteNames[0] + suffix);
    }
    return noteNames[0] + chordSuffix;
  }

  return null;
}

/**
 * スラッシュコードを作成
 * 例: "Dm9(omit5)" + "/C" → "Dm9(omit5)/C"
 */
function createSlashChord(chord: string, bass: string): string {
  const bassUpper = bass.toUpperCase();
  // そのまま結合（修飾子はスラッシュの前に残る）
  return chord + '/' + bassUpper;
}

/**
 * 転回形を検出
 */
function findWithRotate(noteNames: string[], root: string, chordMap: ChordMap): string[] {
  const results: string[] = [];

  // 配列を回転させながら検索
  for (let i = 1; i < noteNames.length; i++) {
    const rotated = [...noteNames.slice(i), ...noteNames.slice(0, i)];
    const res = find(rotated, chordMap);

    if (res) {
      // 配列の場合は各要素を処理
      const chords = Array.isArray(res) ? res : [res];
      for (const chord of chords) {
        results.push(createSlashChord(chord, root));
      }
    }
  }

  return results;
}

/**
 * 音名配列をインターバル配列に変換
 */
function toIntervals(noteNames: string[]): number[] {
  if (noteNames.length === 0) return [];

  const rootPitch = chord2num[noteNames[0].toLowerCase()];
  if (rootPitch === undefined) {
    console.error('Unknown root note:', noteNames[0]);
    return [];
  }

  return noteNames.map(name => {
    if (!name) {
      console.error('Undefined note name in:', noteNames);
      return 0;
    }
    const pitch = chord2num[name.toLowerCase()];
    if (pitch === undefined) {
      console.error('Unknown note:', name, 'in', noteNames);
      return 0;
    }
    return (pitch - rootPitch + 12) % 12;
  });
}

/**
 * 生成されたコードマップを取得（キャッシュ付き、omitなし）
 */
function getGeneratedChordMap(): ChordMap {
  if (!generatedChordMap) {
    generatedChordMap = generateChordList();
  }
  return generatedChordMap;
}

/**
 * 生成されたコードマップを取得（キャッシュ付き、omitあり）
 */
function getGeneratedChordMapWithOmit(): ChordMap {
  if (!generatedChordMapWithOmit) {
    generatedChordMapWithOmit = generateChordListWithOmit();
  }
  return generatedChordMapWithOmit;
}
