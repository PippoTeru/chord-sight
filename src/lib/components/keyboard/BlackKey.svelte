<script lang="ts">
	import type { BlackPianoKey } from '$lib/types';
	import { settingsStore } from '$lib/stores';
	import {
		DIMENSIONS,
		createRoundedBottomPath,
		getBlackKeyX
	} from '$lib/utils/keyboard';

	interface Props {
		keyData: BlackPianoKey;
		isActive: boolean;
	}

	let { keyData, isActive }: Props = $props();

	/**
	 * 黒鍵のX座標を計算
	 */
	let x = $derived(getBlackKeyX(keyData.note, keyData.octave));

	/**
	 * 角丸の半径を計算
	 */
	let cornerRadius = $derived(DIMENSIONS.blackKeyWidth * DIMENSIONS.cornerRadiusRatio);

	/**
	 * SVGパスを生成
	 */
	let path = $derived(
		createRoundedBottomPath(x, 0, DIMENSIONS.blackKeyWidth, DIMENSIONS.blackKeyHeight, cornerRadius)
	);
</script>

<g class="black-key" class:active={isActive} style="--highlight-color: {settingsStore.highlightColor}">
	<!-- 黒鍵本体 -->
	<path d={path} class="key-body" class:active-fill={isActive && settingsStore.visualFeedbackEnabled} />

	<!-- ストローク（輪郭線） -->
	<path d={path} class="key-stroke" />
</g>

<style>
	.key-body {
		fill: #000000;
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
</style>
