<script lang="ts">
	import { activeKeys } from '$lib/stores/audioStore';
	import { isDarkMode } from '$lib/stores/settingsStore';
	import { detectChordWithCandidates } from '$lib/utils/chordDetector';
	import { onMount } from 'svelte';

	let chordNameElement: HTMLDivElement | undefined = $state();
	let chordNameAreaElement: HTMLDivElement | undefined = $state();
	let fontSize = $state(12); // rem
	let isAdjusting = $state(false); // 調整中フラグ

	let noteNamesElement: HTMLDivElement | undefined = $state();
	let noteNamesAreaElement: HTMLDivElement | undefined = $state();
	let noteNamesFontSize = $state(2.5); // rem
	let isNoteNamesAdjusting = $state(false); // 調整中フラグ

	/**
	 * MIDI番号から音名を取得
	 */
	function midiToNoteName(midiNumber: number): string {
		const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
		const octave = Math.floor(midiNumber / 12) - 1;
		const noteName = noteNames[midiNumber % 12];
		return `${noteName}${octave}`;
	}

	/**
	 * フォントサイズを調整してページ幅に収める（コード名）
	 */
	function adjustFontSize() {
		// SSR時はスキップ
		if (typeof window === 'undefined') return;
		if (!chordNameElement || !chordNameAreaElement) return;

		// 調整開始（非表示にする）
		isAdjusting = true;

		// まず最大サイズに設定
		fontSize = 12; // rem

		// 2回のrequestAnimationFrameで確実にDOMが更新されるのを待つ
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (!chordNameElement || !chordNameAreaElement) return;

				const maxWidth = chordNameAreaElement.clientWidth;
				const actualWidth = chordNameElement.getBoundingClientRect().width;

				if (actualWidth > maxWidth) {
					// 幅がオーバーしている場合、比率で縮小
					const ratio = maxWidth / actualWidth;
					fontSize = 12 * ratio * 0.98; // 2%マージン
				}

				// 調整完了（表示する）
				isAdjusting = false;
			});
		});
	}

	/**
	 * フォントサイズを調整してページ幅に収める（音名表示）
	 */
	function adjustNoteNamesFontSize() {
		// SSR時はスキップ
		if (typeof window === 'undefined') return;
		if (!noteNamesElement || !noteNamesAreaElement) return;

		// 調整開始（非表示にする）
		isNoteNamesAdjusting = true;

		// まず最大サイズに設定
		noteNamesFontSize = 2.5; // rem

		// 2回のrequestAnimationFrameで確実にDOMが更新されるのを待つ
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (!noteNamesElement || !noteNamesAreaElement) return;

				const maxWidth = noteNamesAreaElement.clientWidth;
				const actualWidth = noteNamesElement.getBoundingClientRect().width;

				console.log('[NoteNames] maxWidth:', maxWidth, 'actualWidth:', actualWidth);

				if (actualWidth > maxWidth) {
					// 幅がオーバーしている場合、比率で縮小
					const ratio = maxWidth / actualWidth;
					noteNamesFontSize = 2.5 * ratio * 0.98; // 2%マージン
					console.log('[NoteNames] Adjusted fontSize:', noteNamesFontSize, 'ratio:', ratio);
				}

				// 調整完了（表示する）
				isNoteNamesAdjusting = false;
			});
		});
	}

	/**
	 * アクティブな音名のリストを取得
	 */
	let activeNoteNames = $derived(
		Array.from($activeKeys)
			.sort((a, b) => a - b)
			.map((midiNumber) => midiToNoteName(midiNumber))
	);

	/**
	 * コード判定と表示用フォーマット（全候補を取得）
	 */
	let chordCandidates = $derived(detectChordWithCandidates($activeKeys));

	// コード名が変わったらフォントサイズを調整
	$effect(() => {
		if (chordCandidates.length > 0) {
			adjustFontSize();
		}
	});

	// 音名が変わったらフォントサイズを調整
	$effect(() => {
		if (activeNoteNames.length > 0) {
			adjustNoteNamesFontSize();
		}
	});

</script>

<div class="chord-display" class:dark={$isDarkMode}>
	<div class="chord-name-area" bind:this={chordNameAreaElement}>
		{#if $activeKeys.size > 1 && chordCandidates.length > 0}
			<div class="chord-candidates">
				<!-- 第1候補（大きく表示、中央固定） -->
				<div
					class="chord-name primary"
					class:adjusting={isAdjusting}
					bind:this={chordNameElement}
					style="font-size: {fontSize}rem;"
				>
					{@html chordCandidates[0]}
				</div>
			</div>

			<!-- 第2・第3候補（絶対配置で下に表示） -->
			{#if chordCandidates.length > 1}
				<div class="chord-alternatives">
					{#each chordCandidates.slice(1) as candidate}
						<div class="chord-name alternative">
							{@html candidate}
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	<div class="note-names-area" bind:this={noteNamesAreaElement}>
		{#if activeNoteNames.length > 0}
			<div
				class="note-names"
				class:adjusting={isNoteNamesAdjusting}
				bind:this={noteNamesElement}
				style="font-size: {noteNamesFontSize}rem;"
			>
				{activeNoteNames.join(' ')}
			</div>
		{/if}
	</div>
</div>

<style>
	@font-face {
		font-family: 'MNotoSans';
		src: url('/MNotoSans-alpha-ExtraBold.ttf') format('truetype');
		font-weight: 800;
		font-style: normal;
	}

	.chord-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		pointer-events: none;
		user-select: none;
	}

	.chord-name-area {
		flex: 1;
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

	.chord-alternatives {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, 0);
		margin-top: 8rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.note-names-area {
		flex-shrink: 0;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		width: 100%;
		min-height: 4rem;
		padding-bottom: 2rem;
	}

	.chord-name {
		font-family: 'MNotoSans', sans-serif;
		font-weight: 800;
		color: #333;
		transition: color 0.3s ease;
		white-space: nowrap;
	}

	.chord-name.primary {
		/* 第1候補は大きく表示（font-sizeはインラインで動的に設定） */
	}

	.chord-name.alternative {
		font-size: 3rem;
		opacity: 0.5;
	}

	.chord-name.adjusting {
		opacity: 0;
	}

	.chord-display.dark .chord-name {
		color: #e0e0e0;
	}

	.note-names {
		font-weight: 500;
		color: #666;
		font-family: monospace;
		transition: color 0.3s ease;
		white-space: nowrap;
	}

	.note-names.adjusting {
		opacity: 0;
	}

	.chord-display.dark .note-names {
		color: #999;
	}
</style>
