<script lang="ts">
	import { onMount } from 'svelte';
	import { midiStore, settingsStore } from '$lib/stores';
	import { KEYBOARD_VIEWBOX_WIDTH, KEYBOARD_VIEWBOX_HEIGHT } from '$lib/constants';
	import { generateWhiteKeys, generateBlackKeys } from '$lib/utils/keyboard';
	import WhiteKey from './WhiteKey.svelte';
	import BlackKey from './BlackKey.svelte';

	/**
	 * ViewBox サイズ
	 */
	const VIEW_BOX = {
		width: KEYBOARD_VIEWBOX_WIDTH,
		height: KEYBOARD_VIEWBOX_HEIGHT,
	} as const;

	/**
	 * 白鍵と黒鍵のデータを生成
	 * コンポーネント初期化時に一度だけ実行される
	 */
	const whiteKeys = generateWhiteKeys();
	const blackKeys = generateBlackKeys();

	/**
	 * コンポーネント初期化時（MIDIを初期化）
	 */
	onMount(async () => {
		await midiStore.initialize();
	});

	/**
	 * 鍵盤がアクティブか判定
	 */
	function isKeyActive(midiNumber: number): boolean {
		if (!settingsStore.visualFeedbackEnabled) {
			return false;
		}

		// トランスポーズモードの場合、逆変換して元の押された鍵盤を探す
		if (settingsStore.keyHighlightMode === 'transposed') {
			// midiNumberはこの鍵盤の番号
			// activeKeysは実際に押された鍵盤の番号
			// 実際に押された鍵盤 + transpose = 表示される鍵盤
			// なので、midiNumber - transpose = 実際に押された鍵盤
			const originalMidiNumber = midiNumber - settingsStore.transpose;
			return midiStore.activeKeys.has(originalMidiNumber);
		}

		// オリジナルモードの場合、そのまま判定
		return midiStore.activeKeys.has(midiNumber);
	}
</script>

<div class="piano-container">
	<!-- サステインペダルインジケーター -->
	{#if settingsStore.sustainIndicatorEnabled}
		<div class="sustain-indicator" class:active={midiStore.sustainPedalDown}>
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
		aria-label="Virtual Keyboard"
		role="application"
	>
		<!-- 白鍵 -->
		{#each whiteKeys as key}
			<WhiteKey keyData={key} isActive={isKeyActive(key.midiNumber)} />
		{/each}

		<!-- 黒鍵 -->
		{#each blackKeys as key}
			<BlackKey keyData={key} isActive={isKeyActive(key.midiNumber)} />
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
		font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue',
			Arial, sans-serif;
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
