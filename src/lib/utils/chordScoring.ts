// スコアリングシステム
// chord-detection-spec-v3.md に基づく実装

type ScoringRule = [RegExp, number];

/**
 * スコアリングルール（通常形式のコード名に対して適用）
 */
const scoring_rules: ScoringRule[] = [
  [/omit\d|\(\+13\)/g, 6],        // omitや(+13)は低優先（+をエスケープ）
  [/\([+-]?\d+\)/g, 5],           // 括弧付きテンションは低優先
  [/aug|6|5|add\d+|sus2/g, 4],    // 特殊コードは低優先
  [/dim7|11|13|\/.*$|9/g, 3],     // 9th, 11th, 13th, 転回形
  [/sus4|M7|7/g, 2],              // sus4, M7, 7th
];

/**
 * コード名のスコアを計算
 * スコアが高いほど優先度が高い（ペナルティを減算）
 */
export function calculateScore(chordName: string): number {
  let score = 0;
  let str = chordName;

  for (const [regex, penalty] of scoring_rules) {
    const matches = str.match(regex);
    str = str.replace(regex, ""); // マッチ部分を削除
    score -= matches ? matches.length * penalty : 0;
  }

  return score;
}

/**
 * 複数の候補から最適なコード名を選択
 */
export function selectBestChordName(chordNames: string[]): string[] {
  const scores = chordNames.map(name => calculateScore(name));
  const maxScore = Math.max(...scores);

  // 最高スコアのコード名のみ返す
  return chordNames.filter((name, i) => scores[i] === maxScore);
}

/**
 * 複数の候補をスコア順にグループ化して返す
 * 返り値: [[1位の候補たち], [2位の候補たち], [3位の候補たち], ...]
 */
export function groupCandidatesByScore(chordNames: string[]): string[][] {
  if (chordNames.length === 0) return [];

  // スコアを計算
  const scored = chordNames.map(name => ({
    name,
    score: calculateScore(name)
  }));

  // スコアの降順でソート
  scored.sort((a, b) => b.score - a.score);

  // スコアごとにグループ化
  const groups: string[][] = [];
  let currentGroup: string[] = [];
  let currentScore = scored[0].score;

  for (const item of scored) {
    if (item.score === currentScore) {
      currentGroup.push(item.name);
    } else {
      groups.push(currentGroup);
      currentGroup = [item.name];
      currentScore = item.score;
    }
  }

  // 最後のグループを追加
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
