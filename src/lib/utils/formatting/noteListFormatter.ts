/**
 * Note List Formatting Utilities
 *
 * MIDI番号のSetを音名リストにフォーマットする関数群。
 */

import type { AccidentalNotation } from '$lib/types';
import { midiToNoteName } from '../midi/midiUtils';

/**
 * MIDI番号のSetをソートされた音名配列に変換
 *
 * 1. SetをArrayに変換
 * 2. MIDI番号でソート（昇順）
 * 3. 各MIDI番号を音名に変換
 *
 * @param midiNumbers - MIDI番号のSet
 * @param notation - 臨時記号の表記法（sharp または flat）
 * @returns ソートされた音名の配列
 *
 * @example
 * const midiNumbers = new Set([60, 64, 67]); // C, E, G
 * formatActiveNoteNames(midiNumbers, 'sharp')
 * // => ['C4', 'E4', 'G4']
 */
export function formatActiveNoteNames(
	midiNumbers: Set<number>,
	notation: AccidentalNotation
): string[] {
	return Array.from(midiNumbers)
		.sort((a, b) => a - b)
		.map(midiNumber => midiToNoteName(midiNumber, notation));
}

/**
 * 音名配列を空白区切りのテキストに結合
 *
 * @param noteNames - 音名の配列
 * @returns 空白区切りのテキスト
 *
 * @example
 * formatNoteNamesAsText(['C4', 'E4', 'G4'])
 * // => 'C4 E4 G4'
 */
export function formatNoteNamesAsText(noteNames: string[]): string {
	return noteNames.join(' ');
}

/**
 * ♭と♯記号をspan要素で囲んでスペーシング調整
 *
 * 臨時記号の前後にわずかなマージンを追加して可読性を向上。
 *
 * @param noteNamesText - 空白区切りの音名テキスト
 * @returns HTML形式のフォーマット済みテキスト
 *
 * @example
 * formatNoteNamesAsHTML('D♭4 G♭4')
 * // => 'D<span class="flat">♭</span>4 G<span class="flat">♭</span>4'
 *
 * formatNoteNamesAsHTML('C♯4 F♯4')
 * // => 'C<span class="sharp">♯</span>4 F<span class="sharp">♯</span>4'
 */
export function formatNoteNamesAsHTML(noteNamesText: string): string {
	return noteNamesText
		.replace(/♭/g, '<span class="flat">♭</span>')
		.replace(/♯/g, '<span class="sharp">♯</span>');
}

/**
 * MIDI番号のSetをHTML形式の音名リストに変換（一括処理）
 *
 * 内部で以下の処理を順次実行：
 * 1. Set → ソート済み音名配列
 * 2. 配列 → 空白区切りテキスト
 * 3. ♭記号のHTML装飾
 *
 * @param midiNumbers - MIDI番号のSet
 * @param notation - 臨時記号の表記法
 * @returns HTML形式のフォーマット済みテキスト
 *
 * @example
 * const midiNumbers = new Set([61, 65, 68]); // C#, F, G#
 * formatNoteList(midiNumbers, 'sharp')
 * // => 'C♯4 F4 G♯4'
 *
 * const midiNumbers2 = new Set([61, 65, 68]); // Db, F, Ab
 * formatNoteList(midiNumbers2, 'flat')
 * // => 'D<span class="flat">♭</span>4 F4 A<span class="flat">♭</span>4'
 */
export function formatNoteList(
	midiNumbers: Set<number>,
	notation: AccidentalNotation
): string {
	const noteNames = formatActiveNoteNames(midiNumbers, notation);
	const plainText = formatNoteNamesAsText(noteNames);
	return formatNoteNamesAsHTML(plainText);
}
