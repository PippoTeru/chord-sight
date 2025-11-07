/**
 * Chord Detector - 包括的なテストケース
 *
 * すべてのコードパターンを体系的にカバーするテストケース集
 * Cルート（ピッチクラス0）を使用
 */

import { detectChord } from './chordDetector';

// テストケース型定義
interface TestCase {
	name: string;
	pitchClasses: number[];
	expected: string;
	notes: string;
}

/**
 * 包括的なテストケース一覧
 */
export const COMPREHENSIVE_TEST_CASES: TestCase[] = [
	// ========================================
	// 1. 基本トライアド（7種類）
	// ========================================
	{
		name: 'Major triad',
		pitchClasses: [0, 4, 7],
		expected: 'C',
		notes: 'C, E, G'
	},
	{
		name: 'Minor triad',
		pitchClasses: [0, 3, 7],
		expected: 'Cm',
		notes: 'C, Eb, G'
	},
	{
		name: 'Augmented triad',
		pitchClasses: [0, 4, 8],
		expected: 'Caug',
		notes: 'C, E, G#'
	},
	{
		name: 'Diminished triad',
		pitchClasses: [0, 3, 6],
		expected: 'Cdim',
		notes: 'C, Eb, Gb'
	},
	{
		name: 'Suspended 4th',
		pitchClasses: [0, 5, 7],
		expected: 'Csus4',
		notes: 'C, F, G'
	},
	{
		name: 'Suspended 2nd',
		pitchClasses: [0, 2, 7],
		expected: 'Csus2',
		notes: 'C, D, G'
	},
	{
		name: 'Major flat 5',
		pitchClasses: [0, 4, 6],
		expected: 'C(♭5)',
		notes: 'C, E, Gb'
	},

	// ========================================
	// 2. 7thコード（メジャートライアド系）
	// ========================================
	{
		name: 'Major 7th',
		pitchClasses: [0, 4, 7, 11],
		expected: 'CM7',
		notes: 'C, E, G, B'
	},
	{
		name: 'Dominant 7th',
		pitchClasses: [0, 4, 7, 10],
		expected: 'C7',
		notes: 'C, E, G, Bb'
	},
	{
		name: 'Major diminished 7th (theoretical)',
		pitchClasses: [0, 4, 7, 9],
		expected: 'Cdim7',
		notes: 'C, E, G, A'
	},

	// ========================================
	// 3. 7thコード（マイナートライアド系）
	// ========================================
	{
		name: 'Minor major 7th',
		pitchClasses: [0, 3, 7, 11],
		expected: 'CmM7',
		notes: 'C, Eb, G, B'
	},
	{
		name: 'Minor 7th',
		pitchClasses: [0, 3, 7, 10],
		expected: 'Cm7',
		notes: 'C, Eb, G, Bb'
	},
	{
		name: 'Minor diminished 7th (half-diminished)',
		pitchClasses: [0, 3, 6, 10],
		expected: 'Cm7',  // Note: dim triadだが、m7として判定される可能性
		notes: 'C, Eb, Gb, Bb'
	},

	// ========================================
	// 4. 7thコード（オーギュメント系）
	// ========================================
	{
		name: 'Augmented major 7th',
		pitchClasses: [0, 4, 8, 11],
		expected: 'CaugM7',
		notes: 'C, E, G#, B'
	},
	{
		name: 'Augmented 7th',
		pitchClasses: [0, 4, 8, 10],
		expected: 'Caug7',
		notes: 'C, E, G#, Bb'
	},

	// ========================================
	// 5. 7thコード（ディミニッシュ系）
	// ========================================
	{
		name: 'Diminished 7th',
		pitchClasses: [0, 3, 6, 9],
		expected: 'Cdim7',
		notes: 'C, Eb, Gb, A'
	},
	{
		name: 'Half-diminished 7th (m7b5)',
		pitchClasses: [0, 3, 6, 10],
		expected: 'Cdim7', // or Cm7(♭5)
		notes: 'C, Eb, Gb, Bb'
	},

	// ========================================
	// 6. 7thコード（sus系）
	// ========================================
	{
		name: 'Sus4 major 7th',
		pitchClasses: [0, 5, 7, 11],
		expected: 'Csus4M7',
		notes: 'C, F, G, B'
	},
	{
		name: 'Sus4 7th',
		pitchClasses: [0, 5, 7, 10],
		expected: 'Csus47',
		notes: 'C, F, G, Bb'
	},
	{
		name: 'Sus2 major 7th',
		pitchClasses: [0, 2, 7, 11],
		expected: 'Csus2M7',
		notes: 'C, D, G, B'
	},
	{
		name: 'Sus2 7th',
		pitchClasses: [0, 2, 7, 10],
		expected: 'Csus27',
		notes: 'C, D, G, Bb'
	},

	// ========================================
	// 7. 9thコード（基本形）
	// ========================================
	{
		name: 'Major 9th',
		pitchClasses: [0, 4, 7, 11, 2],
		expected: 'CM9',
		notes: 'C, E, G, B, D'
	},
	{
		name: 'Dominant 9th',
		pitchClasses: [0, 4, 7, 10, 2],
		expected: 'C9',
		notes: 'C, E, G, Bb, D'
	},
	{
		name: 'Minor major 9th',
		pitchClasses: [0, 3, 7, 11, 2],
		expected: 'Cm9',  // or CmM9
		notes: 'C, Eb, G, B, D'
	},
	{
		name: 'Minor 9th',
		pitchClasses: [0, 3, 7, 10, 2],
		expected: 'Cm9',
		notes: 'C, Eb, G, Bb, D'
	},

	// ========================================
	// 8. アルタードテンション（♭9, #9）
	// ========================================
	{
		name: 'Dominant 7 flat 9',
		pitchClasses: [0, 4, 7, 10, 1],
		expected: 'C7(♭9)',
		notes: 'C, E, G, Bb, Db'
	},
	{
		name: 'Dominant 7 sharp 9',
		pitchClasses: [0, 4, 7, 10, 3],
		expected: 'C7(#9)',
		notes: 'C, E, G, Bb, D#'
	},
	{
		name: 'Dominant 7 flat 9 sharp 9 (alt)',
		pitchClasses: [0, 4, 7, 10, 1, 3],
		expected: 'C7(♭9,#9)',
		notes: 'C, E, G, Bb, Db, D#'
	},

	// ========================================
	// 9. 11thコード
	// ========================================
	{
		name: 'Major 11th',
		pitchClasses: [0, 4, 7, 11, 2, 5],
		expected: 'CM11',
		notes: 'C, E, G, B, D, F'
	},
	{
		name: 'Dominant 11th',
		pitchClasses: [0, 4, 7, 10, 2, 5],
		expected: 'C11',
		notes: 'C, E, G, Bb, D, F'
	},
	{
		name: 'Minor 11th',
		pitchClasses: [0, 3, 7, 10, 2, 5],
		expected: 'Cm11',
		notes: 'C, Eb, G, Bb, D, F'
	},
	{
		name: '11th without 3rd (sus sound)',
		pitchClasses: [0, 7, 10, 2, 5],
		expected: 'C11',  // 3度省略
		notes: 'C, G, Bb, D, F'
	},

	// ========================================
	// 10. アルタードテンション（#11）
	// ========================================
	{
		name: 'Dominant 7 sharp 11',
		pitchClasses: [0, 4, 7, 10, 6],
		expected: 'C7(#11)',
		notes: 'C, E, G, Bb, F#'
	},
	{
		name: 'Major 7 sharp 11 (Lydian)',
		pitchClasses: [0, 4, 7, 11, 6],
		expected: 'CM7(#11)',
		notes: 'C, E, G, B, F#'
	},
	{
		name: 'Dominant 9 sharp 11',
		pitchClasses: [0, 4, 7, 10, 2, 6],
		expected: 'C9(#11)',
		notes: 'C, E, G, Bb, D, F#'
	},
	{
		name: 'Dominant 7 flat 9 sharp 11',
		pitchClasses: [0, 4, 7, 10, 1, 6],
		expected: 'C7(♭9,#11)',
		notes: 'C, E, G, Bb, Db, F#'
	},

	// ========================================
	// 11. 13thコード
	// ========================================
	{
		name: 'Major 13th',
		pitchClasses: [0, 4, 7, 11, 2, 9],
		expected: 'CM13',
		notes: 'C, E, G, B, D, A'
	},
	{
		name: 'Dominant 13th',
		pitchClasses: [0, 4, 7, 10, 2, 9],
		expected: 'C13',
		notes: 'C, E, G, Bb, D, A'
	},
	{
		name: 'Minor 13th',
		pitchClasses: [0, 3, 7, 10, 2, 9],
		expected: 'Cm13',
		notes: 'C, Eb, G, Bb, D, A'
	},
	{
		name: 'Dominant 13th with sharp 11',
		pitchClasses: [0, 4, 7, 10, 2, 6, 9],
		expected: 'C13(#11)',
		notes: 'C, E, G, Bb, D, F#, A'
	},

	// ========================================
	// 12. アルタードテンション（♭13）
	// ========================================
	{
		name: 'Dominant 7 flat 13',
		pitchClasses: [0, 4, 7, 10, 8],
		expected: 'C7(♭13)',
		notes: 'C, E, G, Bb, Ab'
	},
	{
		name: 'Dominant 7 flat 9 flat 13',
		pitchClasses: [0, 4, 7, 10, 1, 8],
		expected: 'C7(♭9,♭13)',
		notes: 'C, E, G, Bb, Db, Ab'
	},
	{
		name: 'Dominant 7 sharp 9 flat 13',
		pitchClasses: [0, 4, 7, 10, 3, 8],
		expected: 'C7(#9,♭13)',
		notes: 'C, E, G, Bb, D#, Ab'
	},

	// ========================================
	// 13. addコード（7度なし）
	// ========================================
	{
		name: 'Major add9',
		pitchClasses: [0, 4, 7, 2],
		expected: 'Cadd9',
		notes: 'C, E, G, D'
	},
	{
		name: 'Minor add9',
		pitchClasses: [0, 3, 7, 2],
		expected: 'Cmadd9',
		notes: 'C, Eb, G, D'
	},
	{
		name: 'Major add11',
		pitchClasses: [0, 4, 7, 5],
		expected: 'Cadd11',
		notes: 'C, E, G, F'
	},
	{
		name: 'Major add13',
		pitchClasses: [0, 4, 7, 9],
		expected: 'Cadd13',
		notes: 'C, E, G, A'
	},
	{
		name: 'Major add9,11',
		pitchClasses: [0, 4, 7, 2, 5],
		expected: 'Cadd(9,11)',
		notes: 'C, E, G, D, F'
	},
	{
		name: 'Major add9,13',
		pitchClasses: [0, 4, 7, 2, 9],
		expected: 'Cadd(9,13)',
		notes: 'C, E, G, D, A'
	},
	{
		name: 'Major add flat 9',
		pitchClasses: [0, 4, 7, 1],
		expected: 'Cadd♭9',
		notes: 'C, E, G, Db'
	},
	{
		name: 'Major add sharp 9',
		pitchClasses: [0, 4, 7, 3],
		expected: 'Cadd#9',
		notes: 'C, E, G, D#'
	},
	{
		name: 'Major add sharp 11',
		pitchClasses: [0, 4, 7, 6],
		expected: 'Cadd#11',
		notes: 'C, E, G, F#'
	},

	// ========================================
	// 14. 複雑な複合テンション
	// ========================================
	{
		name: 'Dominant alt (7b9#9)',
		pitchClasses: [0, 4, 7, 10, 1, 3],
		expected: 'C7(♭9,#9)',
		notes: 'C, E, G, Bb, Db, D#'
	},
	{
		name: 'Dominant 7 all altered tensions',
		pitchClasses: [0, 4, 7, 10, 1, 3, 6, 8],
		expected: 'C7(♭9,#9,#11,♭13)',
		notes: 'C, E, G, Bb, Db, D#, F#, Ab'
	},
	{
		name: 'Dominant 13 sharp 9 sharp 11',
		pitchClasses: [0, 4, 7, 10, 3, 6, 9],
		expected: 'C13(#9,#11)',
		notes: 'C, E, G, Bb, D#, F#, A'
	},

	// ========================================
	// 15. 特殊なコード構造
	// ========================================
	{
		name: 'Power chord (5th)',
		pitchClasses: [0, 7],
		expected: 'C5',
		notes: 'C, G'
	},
	{
		name: 'Major 6th',
		pitchClasses: [0, 4, 7, 9],
		expected: 'Cadd13',  // Note: 13度として解釈される
		notes: 'C, E, G, A'
	},
	{
		name: 'Minor 6th',
		pitchClasses: [0, 3, 7, 9],
		expected: 'Cmadd13',
		notes: 'C, Eb, G, A'
	},
	{
		name: 'Major 6/9',
		pitchClasses: [0, 4, 7, 9, 2],
		expected: 'Cadd(9,13)',
		notes: 'C, E, G, A, D'
	},

	// ========================================
	// 16. オーギュメント系の複雑なコード
	// ========================================
	{
		name: 'Augmented 9th',
		pitchClasses: [0, 4, 8, 10, 2],
		expected: 'Caug9',
		notes: 'C, E, G#, Bb, D'
	},
	{
		name: 'Augmented major 9th',
		pitchClasses: [0, 4, 8, 11, 2],
		expected: 'CaugM9',
		notes: 'C, E, G#, B, D'
	},

	// ========================================
	// 17. ディミニッシュ系の複雑なコード
	// ========================================
	{
		name: 'Diminished major 7th',
		pitchClasses: [0, 3, 6, 11],
		expected: 'CdimM7',
		notes: 'C, Eb, Gb, B'
	},
	{
		name: 'Half-diminished 9th (m7b5 with 9)',
		pitchClasses: [0, 3, 6, 10, 2],
		expected: 'Cdim9',  // or Cm9(♭5)
		notes: 'C, Eb, Gb, Bb, D'
	},

	// ========================================
	// 18. サスペンション系の複雑なコード
	// ========================================
	{
		name: 'Sus4 9th',
		pitchClasses: [0, 5, 7, 10, 2],
		expected: 'Csus49',
		notes: 'C, F, G, Bb, D'
	},
	{
		name: 'Sus2 add11',
		pitchClasses: [0, 2, 7, 5],
		expected: 'Csus2add11',
		notes: 'C, D, G, F'
	},

	// ========================================
	// 19. エッジケース（3度省略パターン）
	// ========================================
	{
		name: 'Dominant 7 no 3rd',
		pitchClasses: [0, 7, 10],
		expected: null,  // トライアドが判定されないため、null
		notes: 'C, G, Bb'
	},
	{
		name: 'Dominant 9 no 3rd',
		pitchClasses: [0, 7, 10, 2],
		expected: null,  // トライアドが判定されないため、null
		notes: 'C, G, Bb, D'
	},
	{
		name: '11th chord (typical voicing with no 3rd)',
		pitchClasses: [0, 7, 10, 2, 5],
		expected: null,  // sus4として判定される可能性あり
		notes: 'C, G, Bb, D, F'
	},

	// ========================================
	// 20. 単音・特殊ケース
	// ========================================
	{
		name: 'Single note',
		pitchClasses: [0],
		expected: null,
		notes: 'C'
	},
	{
		name: 'Empty set',
		pitchClasses: [],
		expected: null,
		notes: '(none)'
	},

	// ========================================
	// 21. 転回形のテストケース
	// ========================================
	// Note: 転回形は実際のMIDI番号が必要なため、
	// pitchClassベースのテストでは限界がある
	// 実際のテストでは、特定のMIDI番号を使用する必要がある
];

/**
 * テストヘルパー: ピッチクラスからMIDI番号セットを生成
 * デフォルトはオクターブ4（C4=60）
 */
export function pitchClassesToMidiSet(pitchClasses: number[], octave: number = 4): Set<number> {
	return new Set(pitchClasses.map(pc => pc + (octave + 1) * 12));
}

/**
 * テスト実行関数
 */
export function runTests() {
	console.log('=== Comprehensive Chord Detection Tests ===\n');

	let passed = 0;
	let failed = 0;
	const failures: Array<{ test: TestCase; actual: string | null }> = [];

	for (const testCase of COMPREHENSIVE_TEST_CASES) {
		if (testCase.pitchClasses.length === 0) {
			// 空セットの特殊ケース
			const result = detectChord(new Set<number>());
			const actual = result?.displayName || null;

			if (actual === testCase.expected) {
				passed++;
				console.log(`✓ ${testCase.name}`);
			} else {
				failed++;
				failures.push({ test: testCase, actual });
				console.log(`✗ ${testCase.name}`);
				console.log(`  Expected: ${testCase.expected}`);
				console.log(`  Got: ${actual}`);
			}
			continue;
		}

		const midiSet = pitchClassesToMidiSet(testCase.pitchClasses);
		const result = detectChord(midiSet);
		const actual = result?.displayName || null;

		if (actual === testCase.expected) {
			passed++;
			console.log(`✓ ${testCase.name}`);
		} else {
			failed++;
			failures.push({ test: testCase, actual });
			console.log(`✗ ${testCase.name}`);
			console.log(`  Notes: ${testCase.notes}`);
			console.log(`  Expected: ${testCase.expected}`);
			console.log(`  Got: ${actual}`);
		}
	}

	console.log('\n=== Test Summary ===');
	console.log(`Total: ${COMPREHENSIVE_TEST_CASES.length}`);
	console.log(`Passed: ${passed}`);
	console.log(`Failed: ${failed}`);
	console.log(`Success Rate: ${((passed / COMPREHENSIVE_TEST_CASES.length) * 100).toFixed(1)}%`);

	if (failures.length > 0) {
		console.log('\n=== Failed Tests Detail ===');
		failures.forEach(({ test, actual }) => {
			console.log(`\n${test.name}:`);
			console.log(`  Notes: ${test.notes}`);
			console.log(`  Expected: ${test.expected}`);
			console.log(`  Got: ${actual}`);
		});
	}

	return { passed, failed, total: COMPREHENSIVE_TEST_CASES.length, failures };
}
