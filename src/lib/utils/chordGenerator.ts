// 動的コード生成
// chord-detection-spec-v3.md に基づく実装

import type { ChordMap } from './chordMaps';

type ChordEntry = [number | number[] | null, string, ReplacementRule[]?];
type ReplacementRule = [RegExp, string];

/**
 * 動的にコードリストを生成（omitなし）
 */
export function generateChordList(): ChordMap {
  return generateChordListInternal(false);
}

/**
 * 動的にコードリストを生成（omitあり）
 */
export function generateChordListWithOmit(): ChordMap {
  return generateChordListInternal(true);
}

/**
 * 動的にコードリストを生成（内部関数）
 */
function generateChordListInternal(includeOmit: boolean): ChordMap {
  const root_ary: ChordEntry[] = [[0, ""]];

  const third_ary: ChordEntry[] = [
    [null, "(omit3)"],
    [2, "sus2"],
    [3, "m"],
    [4, ""],
    [5, "sus4"],
  ];

  const fifth_ary: ChordEntry[] = [
    [null, "(omit5)"],
    [6, "(-5)"],
    [7, ""],
    [8, "(+5)"],
  ];

  const seventh_ary: ChordEntry[] = [
    [null, ""],
    [9, "6"],
    [10, "7"],
    [11, "M7"],
  ];

  const tension_ary: ChordEntry[] = [
    [1, "(-9)"],
    [2, "(9)", [[/7/, "9"]]],              // 7 → 9 置き換え
    [3, "(+9)"],
    [5, "(11)", [[/9(?!\))/, "11"]]],      // 9 → 11 置き換え（括弧付きでない9）
    [6, "(+11)"],
    [8, "(-13)"],
    [9, "(13)", [[/11(?!\))/, "13"]]],     // 11 → 13 置き換え（括弧付きでない11）
    [10, "(+13)"],
  ];

  // Step 1: 基本コードの生成
  let tmp_ary = productArray(root_ary, third_ary);
  tmp_ary = productArray(tmp_ary, seventh_ary);

  // Step 2: sus4を末尾に移動
  tmp_ary = moveToTail(tmp_ary, /(sus\d)/g);

  // Step 3: 5thを追加
  tmp_ary = productArray(tmp_ary, fifth_ary);

  // Step 4: テンションを1つずつ追加（置き換えルールを適用）
  for (const tension of tension_ary) {
    tmp_ary = productArray(tmp_ary, [[null, ""], tension]);
  }

  // Step 5: omitを末尾に移動
  tmp_ary = moveToTail(tmp_ary, /(\(omit\d\))/g);

  // ChordMapに変換（複数のコード名を配列として保存）
  const chordMap: Record<string, string | string[]> = {};

  for (const [intervals, name] of tmp_ary) {
    if (!intervals) {
      continue;
    }
    if (intervals.length === 0) {
      continue;
    }

    // omitを含むかチェック
    const hasOmit = name.includes('omit');

    // includeOmitがfalseの場合、omitを含むものはスキップ
    if (!includeOmit && hasOmit) {
      continue;
    }

    const key = intervals.join(",");

    // 暗黙的なテンションを削除（13には9,11が暗黙的、11には9が暗黙的）
    let simplifiedName = name;
    if (name.match(/13(?!\))/)) {
      // 13thコードの場合、(9)と(11)と(13)を削除
      simplifiedName = name.replace(/\(9\)/g, '').replace(/\(11\)/g, '').replace(/\(13\)/g, '');
    } else if (name.match(/11(?!\))/)) {
      // 11thコードの場合、(9)と(11)を削除
      simplifiedName = name.replace(/\(9\)/g, '').replace(/\(11\)/g, '');
    } else if (name.match(/9(?!\))/)) {
      // 9thコードの場合、(9)を削除
      simplifiedName = name.replace(/\(9\)/g, '');
    }

    // 既に存在する場合は配列として追加
    const existing = chordMap[key];
    if (existing) {
      // 簡略化版と元の名前が異なる場合、両方追加
      if (simplifiedName !== name) {
        const names = Array.isArray(existing) ? existing : [existing];
        chordMap[key] = [...names, name, simplifiedName];
      } else {
        chordMap[key] = Array.isArray(existing) ? [...existing, name] : [existing, name];
      }
    } else {
      // 簡略化版と元の名前が異なる場合、両方追加
      if (simplifiedName !== name) {
        chordMap[key] = [name, simplifiedName];
      } else {
        chordMap[key] = name;
      }
    }
  }

  return chordMap as ChordMap;
}

/**
 * 2つの配列の直積を計算し、置き換えルールを適用
 */
function productArray(ary1: ChordEntry[], ary2: ChordEntry[]): ChordEntry[] {
  const res: ChordEntry[] = [];

  for (const e1 of ary1) {
    for (const e2 of ary2) {
      // 半音数配列の結合（元の実装に合わせて）
      const ary: number[] = [];
      let hasDuplicate = false;

      [e1[0], e2[0]].forEach((e) => {
        if (e == null) {
          // nullはスキップ
        } else if (Array.isArray(e)) {
          // 配列の場合、各要素を追加
          for (const num of e) {
            if (ary.indexOf(num) >= 0) {
              hasDuplicate = true;
            } else {
              ary.push(num);
            }
          }
        } else {
          // 数値の場合
          if (ary.indexOf(e) >= 0) {
            hasDuplicate = true;
          } else {
            ary.push(e);
          }
        }
      });

      // 重複がある場合はスキップ
      if (hasDuplicate) {
        continue;
      }

      // インターバルをソート
      ary.sort((a, b) => a - b);

      // 表記の結合
      const name = e1[1] + e2[1];
      res.push([ary.length > 0 ? ary : null, name]);

      // 置き換えルールの適用（結合後の文字列全体に対して）
      if (e2[2]) {
        for (const [regex, replacement] of e2[2]) {
          // まず結合後の文字列にマッチするか確認
          if (regex.test(name)) {
            const newName = name.replace(regex, replacement);
            if (newName !== name) {
              res.push([ary.length > 0 ? ary : null, newName]);
            }
          }
        }
      }
    }
  }

  return res;
}

/**
 * インターバル配列を結合（重複チェック付き）
 */
function combineIntervals(arr1: number | number[] | null, arr2: number | number[] | null): number[] | null {
  if (!arr1 && !arr2) return null;
  if (!arr1) {
    return Array.isArray(arr2) ? arr2 : [arr2 as number];
  }
  if (!arr2) {
    return Array.isArray(arr1) ? arr1 : [arr1 as number];
  }

  const combined: number[] = [];

  // arr1の要素を追加
  if (Array.isArray(arr1)) {
    combined.push(...arr1);
  } else {
    combined.push(arr1);
  }

  // arr2の要素を追加
  if (Array.isArray(arr2)) {
    combined.push(...arr2);
  } else {
    combined.push(arr2);
  }

  return combined.sort((a, b) => a - b);
}

/**
 * 重複チェック
 */
function hasDuplicates(arr: number[]): boolean {
  return new Set(arr).size !== arr.length;
}

/**
 * 正規表現にマッチする部分を末尾に移動
 */
function moveToTail(chord_ary: ChordEntry[], regex: RegExp): ChordEntry[] {
  return chord_ary.map(([intervals, name]) => {
    const matches = name.match(new RegExp(regex, 'g'));
    if (matches) {
      const newName = name.replace(new RegExp(regex, 'g'), "") + matches.join("");
      return [intervals, newName];
    }
    return [intervals, name];
  });
}
