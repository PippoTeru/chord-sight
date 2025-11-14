<script lang="ts">
	import { midiStore, settingsStore } from '$lib/stores';
	import { useFontSizeAdjuster } from '$lib/composables/useFontSizeAdjuster.svelte';
	import { formatActiveNoteNames, formatNoteNamesAsText, formatNoteNamesAsHTML } from '$lib/utils';
	import { MAX_NOTE_FONT_SIZE } from '$lib/constants';

	// コンテナ要素の参照
	let containerElement = $state<HTMLElement | undefined>();

	// フォントサイズ調整コンポーザブル
	const fontAdjuster = useFontSizeAdjuster({
		maxFontSize: MAX_NOTE_FONT_SIZE,
		fontFamily: 'monospace',
		fontWeight: 500
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
	 * アクティブな音名のリスト（ソート済み）
	 */
	let activeNoteNames = $derived(
		formatActiveNoteNames(transposedMidiNumbers, settingsStore.accidentalNotation)
	);

	/**
	 * 音名のテキスト（プレーン）
	 */
	let noteNamesTextPlain = $derived(formatNoteNamesAsText(activeNoteNames));

	/**
	 * 音名のテキスト（HTML整形済み）
	 */
	let noteNamesTextFormatted = $derived(formatNoteNamesAsHTML(noteNamesTextPlain));

	/**
	 * フォントサイズ（$derivedで自動計算）
	 */
	let fontSize = $derived.by(() => {
		const containerWidth = containerElement?.clientWidth ?? 0;

		return fontAdjuster.calculateForText(
			noteNamesTextPlain,
			containerWidth
		);
	});
</script>

<div class="note-display" class:dark={settingsStore.isDarkMode}>
	<div class="note-names-area" bind:this={containerElement}>
		{#if activeNoteNames.length > 0}
			<div
				class="note-names"
				style="font-size: {fontSize}rem;"
			>
				{@html noteNamesTextFormatted}
			</div>
		{/if}
	</div>
</div>

<style>
	.note-display {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		user-select: none;
	}

	.note-names-area {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: 4rem;
		padding-bottom: 2rem;
	}

	.note-names {
		font-weight: 500;
		color: #666;
		font-family: monospace;
		transition: color 0.3s ease;
		white-space: nowrap;
	}

	.note-names :global(.flat) {
		margin-left: -0.25em;
		margin-right: -0.25em;
		display: inline-block;
		font-size: 0.9em;
	}

	.note-names :global(.sharp) {
		margin-left: -0.25em;
		margin-right: -0.25em;
		display: inline-block;
		font-size: 0.9em;
	}

	.note-display.dark .note-names {
		color: #999;
	}
</style>
