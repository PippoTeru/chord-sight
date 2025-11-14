<script lang="ts">
	import { midiStore, settingsStore } from '$lib/stores';
	import { detectChord, chordToDegree, formatChordName, formatChordList } from '$lib/utils';
	import { useFontSizeAdjuster } from '$lib/composables/useFontSizeAdjuster.svelte';
	import { MAX_CHORD_FONT_SIZE, MAX_ALTERNATIVES_FONT_SIZE, ALTERNATIVES_MARGIN_TOP } from '$lib/constants';

	// コンテナ要素の参照
	let primaryContainerElement = $state<HTMLElement | undefined>();
	let alternativesContainerElement = $state<HTMLElement | undefined>();

	// フォントサイズ調整コンポーザブル
	const primaryFontAdjuster = useFontSizeAdjuster({
		maxFontSize: MAX_CHORD_FONT_SIZE,
		fontFamily: '"Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
		fontWeight: 800
	});

	const alternativesFontAdjuster = useFontSizeAdjuster({
		maxFontSize: MAX_ALTERNATIVES_FONT_SIZE,
		fontFamily: '"Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
		fontWeight: 800
	});

	/**
	 * トランスポーズを適用したMIDI番号のSet
	 */
	let transposedMidiNumbers = $derived.by(() => {
		// Key Highlight Modeがtransposedの場合、トランスポーズを適用
		if (settingsStore.keyHighlightMode === 'transposed') {
			const transposed = new Set<number>();
			for (const midiNumber of midiStore.activeKeys) {
				transposed.add(midiNumber + settingsStore.transpose);
			}
			return transposed;
		}
		// originalの場合はそのまま
		return midiStore.activeKeys;
	});

	/**
	 * コード判定と表示用フォーマット（全候補を取得）
	 */
	let chordCandidates = $derived(
		detectChord(transposedMidiNumbers, {
			accidentalNotation: settingsStore.accidentalNotation,
			returnAll: true
		})
	);

	/**
	 * コード判定（通常形式、ディグリー変換用）
	 */
	let chordCandidatesRaw = $derived(
		detectChord(transposedMidiNumbers, {
			accidentalNotation: settingsStore.accidentalNotation,
			returnAll: true
		})
	);

	/**
	 * ディグリー表記に変換（候補すべて）
	 */
	let degreeCandidates = $derived.by(() => {
		if (!settingsStore.showDegreeNotation || !settingsStore.selectedTonic) return [];

		return chordCandidatesRaw
			.map(chord => chordToDegree(chord, settingsStore.selectedTonic, settingsStore.selectedKeyMode))
			.filter((degree): degree is string => degree !== null);
	});

	/**
	 * 第1候補のコード名（文字列）
	 * ディグリー表記がONの場合はディグリー、OFFの場合は通常のコード名
	 */
	let primaryChordName = $derived(
		settingsStore.showDegreeNotation && degreeCandidates.length > 0
			? degreeCandidates[0]
			: chordCandidates.length > 0
			? chordCandidates[0]
			: ''
	);

	/**
	 * 第2候補以降をカンマ区切りで結合
	 */
	let alternativesText = $derived.by(() => {
		const candidates = settingsStore.showDegreeNotation && degreeCandidates.length > 0
			? degreeCandidates
			: chordCandidates;

		return candidates.length > 1 ? candidates.slice(1).join(', ') : '';
	});

	/**
	 * フォーマット済みコード名（第1候補）
	 */
	let primaryChordNameFormatted = $derived(formatChordName(primaryChordName));

	/**
	 * フォーマット済みコード名（第2候補以降）
	 */
	let alternativesTextFormatted = $derived(formatChordList(alternativesText));

	/**
	 * 第1候補のフォントサイズ（$derivedで自動計算）
	 */
	let primaryFontSize = $derived.by(() => {
		const containerWidth = primaryContainerElement?.clientWidth ?? 0;
		const html = settingsStore.showDegreeNotation ? primaryChordName : undefined;

		return primaryFontAdjuster.calculateForText(
			primaryChordName,
			containerWidth,
			html
		);
	});

	/**
	 * 第2候補以降のフォントサイズ（$derivedで自動計算）
	 */
	let alternativesFontSize = $derived.by(() => {
		const containerWidth = alternativesContainerElement?.clientWidth ?? 0;
		const html = settingsStore.showDegreeNotation ? alternativesText : undefined;

		return alternativesFontAdjuster.calculateForText(
			alternativesText,
			containerWidth,
			html
		);
	});
</script>

<div class="chord-display" class:dark={settingsStore.isDarkMode} role="region" aria-label="Detected Chord">
	<div class="chord-name-area" bind:this={primaryContainerElement}>
		{#if midiStore.activeKeys.size > 1 && primaryChordName}
			<div class="chord-candidates">
				<!-- 第1候補（大きく表示、中央固定） -->
				<div
					class="chord-name primary"
					style="font-size: {primaryFontSize}rem;"
				>
					{#if settingsStore.showDegreeNotation}
						{@html primaryChordNameFormatted}
					{:else}
						{@html primaryChordNameFormatted}
					{/if}
				</div>
			</div>

			<!-- 第2・第3候補（横並び、カンマ区切り） -->
			{#if alternativesText}
				<div class="chord-alternatives-container" bind:this={alternativesContainerElement}>
					<div
						class="chord-name alternative"
						style="font-size: {alternativesFontSize}rem;"
					>
						{#if settingsStore.showDegreeNotation}
							{@html alternativesTextFormatted}
						{:else}
							{@html alternativesTextFormatted}
						{/if}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.chord-display {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		user-select: none;
	}

	.chord-name-area {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		position: relative;
	}

	.chord-candidates {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.chord-alternatives-container {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, 0);
		margin-top: 8rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 0 2rem;
	}

	.chord-name {
		font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
		font-weight: 800;
		color: #333;
		transition:
			color 0.3s ease,
			opacity 0.1s ease;
		white-space: nowrap;
	}

	.chord-name.alternative {
		opacity: 0.5;
	}

	.chord-display.dark .chord-name {
		color: #e0e0e0;
	}

	/* ♭記号と♯記号のスペーシング調整（上付き文字） */
	.chord-name :global(sup.flat),
	.chord-name :global(sup.sharp) {
		margin-left: -0.25em;
		margin-right: -0.25em;
		display: inline-block;
		font-size: 0.6em;
		vertical-align: super;
		line-height: 0;
	}

	/* クオリティ部分のフォントサイズ */
	.chord-name :global(.quality) {
		font-size: 75%;
	}
</style>
