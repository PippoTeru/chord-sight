<script lang="ts">
	import { onMount } from 'svelte';
	import { audioState, activeKeys, sustainPedalDown, initializeAudio } from '$lib/stores/audioStore';
	import { settings } from '$lib/stores/settingsStore';

	// ========================================
	// 型定義
	// ========================================

	/**
	 * 音名の型定義
	 */
	type WhiteNoteName = "C" | "D" | "E" | "F" | "G" | "A" | "B";
	type BlackNoteName = "C#" | "D#" | "F#" | "G#" | "A#";

	/**
	 * ピアノ鍵盤の型定義
	 */
	interface WhitePianoKey {
		note: WhiteNoteName; // 白鍵の音名（C, D, E, F, G, A, B）
		octave: number; // オクターブ番号（0-8）
		midiNumber: number; // MIDI番号（21-108）
		isBlack: false; // 白鍵フラグ
		isActive: boolean; // アクティブ状態（押下中など）
	}

	interface BlackPianoKey {
		note: BlackNoteName; // 黒鍵の音名（C#, D#, F#, G#, A#）
		octave: number; // オクターブ番号（0-7）
		midiNumber: number; // MIDI番号（22-106）
		isBlack: true; // 黒鍵フラグ
		isActive: boolean; // アクティブ状態（押下中など）
	}

	// ========================================
	// 定数定義
	// ========================================

	/**
	 * 鍵盤の寸法定義
	 * 実際のグランドピアノの比率に基づいて設定
	 */
	const DIMENSIONS = {
		whiteKeyWidth: 23.5,
		blackKeyWidth: 14.1,
		whiteKeyHeight: 150,
		blackKeyHeight: 95,
		cornerRadiusRatio: 0.16, // 鍵盤幅に対する角丸の比率（下部のみ）
		totalWhiteKeys: 52, // 88鍵盤のうち白鍵の数
	} as const;

	/**
	 * 色定義
	 */
	const COLORS = {
		whiteKeyNormal: "#FFFFFF",
		whiteKeyActive: "#888888",
		blackKeyNormal: "#000000",
		blackKeyActive: "#888888",
		border: "#000000",
		label: "#333333",
	} as const;

	/**
	 * 音域定義（88鍵盤：A0-C8）
	 */
	const KEYBOARD_RANGE = {
		startMidi: 21, // A0
		endMidi: 108, // C8
		startOctave: 0,
		lastOctave: 8, // 最後のオクターブ（C8まで）
	} as const;

	/**
	 * スタイル設定
	 */
	const STYLE = {
		borderWidth: 1,
		labelYOffset: 0.05, // 白鍵高さに対する比率
		labelFontSizeRatio: 0.3, // 白鍵幅に対する比率
	} as const;

	/**
	 * ViewBox サイズ（計算値）
	 */
	const VIEW_BOX = {
		width: DIMENSIONS.whiteKeyWidth * DIMENSIONS.totalWhiteKeys,
		height: DIMENSIONS.whiteKeyHeight,
	} as const;

	/**
	 * 音名の順序定義（Cから始まる）
	 */
	const NOTE_ORDER: Record<WhiteNoteName, number> = {
		C: 0,
		D: 1,
		E: 2,
		F: 3,
		G: 4,
		A: 5,
		B: 6,
	} as const;

	/**
	 * 黒鍵のオフセット計算（N等分アルゴリズム）
	 * 実際のピアノの黒鍵配置を再現するため、白鍵をグループごとにN等分し、
	 * その分割点の中心に黒鍵を配置する
	 */
	const BLACK_KEY_OFFSETS: Record<BlackNoteName, number> = (() => {
		const { whiteKeyWidth: W, blackKeyWidth: B } = DIMENSIONS;

		// C～Eグループ（3白鍵を5等分）
		const segmentCE = (3 * W) / 5;

		// F～Bグループ（4白鍵を7等分）
		const segmentFB = (4 * W) / 7;

		return {
			"C#": segmentCE * 1.5 - B / 2, // セグメント1と2の境界
			"D#": segmentCE * 3.5 - B / 2 - W, // セグメント3と4の境界（Dからのオフセット）
			"F#": segmentFB * 1.5 - B / 2, // セグメント1と2の境界
			"G#": segmentFB * 3.5 - B / 2 - W, // セグメント3と4の境界（Gからのオフセット）
			"A#": segmentFB * 5.5 - B / 2 - 2 * W, // セグメント5と6の境界（Aからのオフセット）
		};
	})();

	// ========================================
	// ヘルパー関数
	// ========================================

	/**
	 * 白鍵のインデックス（0-51）を取得
	 * @param note - 音名（C, D, E, F, G, A, B）
	 * @param octave - オクターブ番号（0-8）
	 * @returns 白鍵のインデックス（0-51）
	 */
	function getWhiteKeyIndex(note: WhiteNoteName, octave: number): number {
		// オクターブ0は特殊（A0とB0のみ）
		if (octave === 0) {
			return note === "A" ? 0 : 1;
		}

		// オクターブ1以降はCから始まる
		// オクターブ0のA0, B0の後（インデックス2から）が基準
		return 2 + (octave - 1) * 7 + NOTE_ORDER[note];
	}

	/**
	 * 黒鍵のX座標を計算
	 * @param note - 音名（C#, D#, F#, G#, A#）
	 * @param octave - オクターブ番号（0-7）
	 * @returns 黒鍵のX座標
	 */
	function getBlackKeyX(note: BlackNoteName, octave: number): number {
		const baseNote = note.replace("#", "") as WhiteNoteName;
		const whiteKeyIndex = getWhiteKeyIndex(baseNote, octave);
		const whiteKeyX = whiteKeyIndex * DIMENSIONS.whiteKeyWidth;
		const offset = BLACK_KEY_OFFSETS[note];

		return whiteKeyX + offset;
	}

	/**
	 * 白鍵データを生成（A0からC8まで）
	 * @returns 白鍵データの配列
	 */
	function generateWhiteKeys(): WhitePianoKey[] {
		const keys: WhitePianoKey[] = [];
		let midiNumber = KEYBOARD_RANGE.startMidi;

		// オクターブ0: A0, B0のみ
		keys.push({
			note: "A",
			octave: 0,
			midiNumber: midiNumber++,
			isBlack: false,
			isActive: false,
		});
		midiNumber++; // A#0をスキップ
		keys.push({
			note: "B",
			octave: 0,
			midiNumber: midiNumber++,
			isBlack: false,
			isActive: false,
		});

		// オクターブ1-8: C1からC8まで
		for (let octave = 1; octave <= KEYBOARD_RANGE.lastOctave; octave++) {
			// オクターブ8はCのみ
			const notes: WhiteNoteName[] =
				octave === 8 ? ["C"] : ["C", "D", "E", "F", "G", "A", "B"];

			for (const note of notes) {
				keys.push({
					note,
					octave,
					midiNumber,
					isBlack: false,
					isActive: false,
				});
				midiNumber++;

				// 黒鍵が存在する位置ではMIDI番号をスキップ（E-F、B-C間以外）
				if (note !== "E" && note !== "B" && octave < 8) {
					midiNumber++;
				}
			}
		}

		return keys;
	}

	/**
	 * 黒鍵データを生成（A#0からG#7まで）
	 * @returns 黒鍵データの配列
	 */
	function generateBlackKeys(): BlackPianoKey[] {
		const keys: BlackPianoKey[] = [];

		// オクターブ0: A#0のみ（A0=21 + 1 = 22）
		keys.push({
			note: "A#",
			octave: 0,
			midiNumber: KEYBOARD_RANGE.startMidi + 1,
			isBlack: true,
			isActive: false,
		});

		// オクターブ1-7: 各オクターブに5つの黒鍵
		for (let octave = 1; octave <= 7; octave++) {
			const blackNotes: readonly BlackNoteName[] = [
				"C#",
				"D#",
				"F#",
				"G#",
				"A#",
			];
			const baseMidi = 12 * octave + 12; // オクターブのCのMIDI番号
			const midiOffsets = [1, 3, 6, 8, 10]; // Cからの各黒鍵のオフセット

			blackNotes.forEach((note, index) => {
				keys.push({
					note,
					octave,
					midiNumber: baseMidi + midiOffsets[index],
					isBlack: true,
					isActive: false,
				});
			});
		}

		return keys;
	}

	/**
	 * 下部のみ角丸のSVGパスを生成
	 * 上部は直角、下部のみ角丸にした矩形パスを作成
	 * @param x - 左上のX座標
	 * @param y - 左上のY座標
	 * @param width - 幅
	 * @param height - 高さ
	 * @param radius - 角丸の半径
	 * @returns SVGパス文字列
	 */
	function createRoundedBottomPath(
		x: number,
		y: number,
		width: number,
		height: number,
		radius: number,
	): string {
		return `
			M ${x} ${y}
			L ${x + width} ${y}
			L ${x + width} ${height - radius}
			Q ${x + width} ${height} ${x + width - radius} ${height}
			L ${x + radius} ${height}
			Q ${x} ${height} ${x} ${height - radius}
			Z
		`
			.trim()
			.replace(/\s+/g, " ");
	}

	// ========================================
	// データ生成
	// ========================================

	/**
	 * 白鍵と黒鍵のデータを生成
	 * コンポーネント初期化時に一度だけ実行される
	 */
	const whiteKeys = generateWhiteKeys();
	const blackKeys = generateBlackKeys();

	/**
	 * 角丸の半径を事前計算（パフォーマンス最適化）
	 */
	const whiteKeyRadius =
		DIMENSIONS.whiteKeyWidth * DIMENSIONS.cornerRadiusRatio;
	const blackKeyRadius =
		DIMENSIONS.blackKeyWidth * DIMENSIONS.cornerRadiusRatio;

	/**
	 * 各鍵盤のパス文字列を事前計算（パフォーマンス最適化）
	 */
	const whiteKeyPaths: string[] = whiteKeys.map((_, index) =>
		createRoundedBottomPath(
			index * DIMENSIONS.whiteKeyWidth,
			0,
			DIMENSIONS.whiteKeyWidth,
			DIMENSIONS.whiteKeyHeight,
			whiteKeyRadius,
		),
	);

	const blackKeyPaths: string[] = blackKeys.map((key) =>
		createRoundedBottomPath(
			getBlackKeyX(key.note, key.octave),
			0,
			DIMENSIONS.blackKeyWidth,
			DIMENSIONS.blackKeyHeight,
			blackKeyRadius,
		),
	);

	/**
	 * 音名ラベルの表示設定を事前計算（パフォーマンス最適化）
	 */
	const labelXPositions: number[] = whiteKeys.map(
		(_, index) => (index + 0.5) * DIMENSIONS.whiteKeyWidth,
	);
	const labelY: number = DIMENSIONS.whiteKeyHeight * (1 - STYLE.labelYOffset);
	const labelFontSize: number =
		DIMENSIONS.whiteKeyWidth * STYLE.labelFontSizeRatio;

	// ========================================
	// ライフサイクル
	// ========================================

	/**
	 * コンポーネント初期化時にAudioEngineを起動
	 */
	onMount(async () => {
		console.log('🎹 Piano component mounted, initializing audio...');
		await initializeAudio();
	});

	/**
	 * 鍵盤がアクティブか判定
	 */
	function isKeyActive(midiNumber: number): boolean {
		return $activeKeys.has(midiNumber);
	}
</script>

<div class="piano-container">
	<!-- サステインペダルインジケーター -->
	{#if $settings.sustainIndicatorEnabled}
		<div class="sustain-indicator" class:active={$sustainPedalDown}>
			<div class="pedal-icon">
				🎹
			</div>
			<div class="pedal-label">
				Sustain Pedal
			</div>
		</div>
	{/if}

	<svg
		viewBox="0 0 {VIEW_BOX.width} {VIEW_BOX.height}"
		width="100%"
		height="100%"
		preserveAspectRatio="xMidYMid meet"
		aria-label="88鍵盤ピアノキーボード"
		role="img"
	>
		<!-- 白鍵 -->
		{#each whiteKeys as key, index}
			<path
				d={whiteKeyPaths[index]}
				fill={isKeyActive(key.midiNumber) ? COLORS.whiteKeyActive : COLORS.whiteKeyNormal}
				stroke={COLORS.border}
				stroke-width={STYLE.borderWidth}
				aria-label="Piano key {key.note}{key.octave}"
			/>

			<!-- 音名ラベル（Cの鍵盤のみ） -->
			{#if key.note === "C" && key.octave >= 1}
				<text
					x={labelXPositions[index]}
					y={labelY}
					font-size={labelFontSize}
					fill={COLORS.label}
				>
					C{key.octave}
				</text>
			{/if}
		{/each}

		<!-- 黒鍵 -->
		{#each blackKeys as key, index}
			<path
				d={blackKeyPaths[index]}
				fill={isKeyActive(key.midiNumber) ? COLORS.blackKeyActive : COLORS.blackKeyNormal}
				stroke={COLORS.border}
				stroke-width={STYLE.borderWidth}
				aria-label="Piano key {key.note}{key.octave}"
			/>
		{/each}
	</svg>
</div>

<style>
	.piano-container {
		position: relative;
	}

	svg {
		display: block;
		margin: 0 auto;
	}

	text {
		font-family: sans-serif;
		font-weight: normal;
		text-anchor: middle;
		dominant-baseline: auto;
	}

	.sustain-indicator {
		position: absolute;
		top: -60px;
		left: 20px;
		padding: 12px 20px;
		background-color: rgba(0, 0, 0, 0.7);
		color: #999;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: sans-serif;
		font-size: 14px;
		transition: background-color 0.05s ease, color 0.05s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		pointer-events: none;
	}

	.sustain-indicator.active {
		background-color: rgba(76, 175, 80, 0.9);
		color: white;
	}

	.pedal-icon {
		font-size: 20px;
		line-height: 1;
	}

	.pedal-label {
		font-weight: 500;
		letter-spacing: 0.5px;
	}
</style>
