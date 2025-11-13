<script lang="ts">
	import type { WhitePianoKey } from '$lib/types';
	import { settingsStore } from '$lib/stores';
	import {
		DIMENSIONS,
		createRoundedBottomPath,
		getWhiteKeyIndex
	} from '$lib/utils/keyboard';

	interface Props {
		keyData: WhitePianoKey;
		isActive: boolean;
	}

	let { keyData, isActive }: Props = $props();

	/**
	 * 白鍵のインデックス（0-51）を計算
	 */
	let index = $derived(getWhiteKeyIndex(keyData.note, keyData.octave));

	/**
	 * 白鍵のX座標を計算
	 */
	let x = $derived(index * DIMENSIONS.whiteKeyWidth);

	/**
	 * 角丸の半径を計算
	 */
	let cornerRadius = $derived(DIMENSIONS.whiteKeyWidth * DIMENSIONS.cornerRadiusRatio);

	/**
	 * SVGパスを生成
	 */
	let path = $derived(
		createRoundedBottomPath(x, 0, DIMENSIONS.whiteKeyWidth, DIMENSIONS.whiteKeyHeight, cornerRadius)
	);

	/**
	 * C鍵盤のみラベルを表示（オクターブ番号付き）
	 */
	let showLabel = $derived(keyData.note === 'C' && keyData.octave >= 1);

	/**
	 * ラベルのテキスト（例: "C4"）
	 */
	let labelText = $derived(`${keyData.note}${keyData.octave}`);

	/**
	 * ラベルのX座標（鍵盤の中心）
	 */
	let labelX = $derived(x + DIMENSIONS.whiteKeyWidth / 2);

	/**
	 * ラベルのY座標（鍵盤の下部付近）
	 */
	let labelY = $derived(DIMENSIONS.whiteKeyHeight - 8);
</script>

<g class="white-key" class:active={isActive} style="--highlight-color: {settingsStore.highlightColor}">
	<!-- 白鍵本体 -->
	<path d={path} class="key-body" class:active-fill={isActive && settingsStore.visualFeedbackEnabled} />

	<!-- ストローク（輪郭線） -->
	<path d={path} class="key-stroke" />

	<!-- Cキーのラベル -->
	{#if showLabel}
		<text x={labelX} y={labelY} class="key-label">{labelText}</text>
	{/if}
</g>

<style>
	.key-body {
		fill: #ffffff;
		transition: fill 0.05s ease;
	}

	.key-body.active-fill {
		fill: var(--highlight-color, #888888);
	}

	.key-stroke {
		fill: none;
		stroke: #000000;
		stroke-width: 1;
	}

	.key-label {
		font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue',
			Arial, sans-serif;
		font-size: 9px;
		font-weight: 500;
		fill: #333333;
		text-anchor: middle;
		dominant-baseline: middle;
		pointer-events: none;
		user-select: none;
	}
</style>
