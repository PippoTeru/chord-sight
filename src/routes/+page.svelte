<script lang="ts">
	import Piano from "$lib/components/Piano.svelte";
	import Settings from "$lib/components/Settings.svelte";
	import ChordDisplay from "$lib/components/ChordDisplay.svelte";
	import { audioState } from "$lib/stores/audioStore";
	import { isDarkMode } from "$lib/stores/settingsStore";
</script>

<div class="app-container">
	<!-- 上部エリア（設定パネルとコード表示） -->
	<div class="content-area" class:dark={$isDarkMode}>
		{#if $audioState.error}
			<div class="error">
				<h2>Error Loading Audio</h2>
				<p>{$audioState.error}</p>
			</div>
		{:else if $audioState.isReady}
			<!-- コード表示 -->
			<ChordDisplay />
		{/if}

		<!-- 設定パネル -->
		<Settings />
	</div>

	<!-- 鍵盤エリア -->
	<div class="keyboard-area" class:dark={$isDarkMode}>
		<Piano />
	</div>

	<!-- ステータスバー -->
	<div class="status-bar" class:dark={$isDarkMode}>
		{#if $audioState.isLoading || $audioState.loadingProgress === 100}
			<!-- ローディング中：プログレスバーを背景に表示 -->
			<div
				class="progress-bg"
				class:dark={$isDarkMode}
				style="width: {$audioState.loadingProgress}%"
				data-progress="{$audioState.loadingProgress}"
			></div>
		{/if}
		<div class="status-content">
			{#if $audioState.isLoading}
				<span class="status-item">
					Loading... {Math.floor($audioState.loadingProgress)}%
				</span>
			{:else if $audioState.isReady}
				<span class="status-item">
					🎹 Ready
				</span>
				<span class="status-item">
					{#if $audioState.midiEnabled}
						MIDI: ✅
					{:else}
						MIDI: ❌
					{/if}
				</span>
				<span class="status-item">
					Voices: {$audioState.activeVoices}
				</span>
			{/if}
		</div>
	</div>
</div>

<style>
	.app-container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
	}

	.content-area {
		flex: 1;
		position: relative;
		background: #f5f5f5;
		transition:
			background-color 0.3s ease,
			color 0.3s ease;
		overflow: hidden;
	}

	.content-area.dark {
		background: #1a1a1a;
		color: #e0e0e0;
	}

	.keyboard-area {
		flex-shrink: 0;
		background: #f5f5f5;
		transition: background-color 0.3s ease;
	}

	.keyboard-area.dark {
		background: #1a1a1a;
	}

	.status-bar {
		flex-shrink: 0;
		height: 25px;
		background: #e0e0e0;
		color: #333;
		position: relative;
		overflow: hidden;
		border-top: 1px solid #ccc;
		transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
		padding: 0;
	}

	.status-bar.dark {
		background: #2d2d2d;
		color: #e0e0e0;
		border-top-color: #444;
	}

	.progress-bg {
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		height: 100%;
		background: linear-gradient(90deg, #4caf50 0%, #81c784 100%);
		z-index: 0;
	}

	.progress-bg.dark {
		background: linear-gradient(90deg, #2e7d32 0%, #4caf50 100%);
	}

	.status-content {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		padding: 0 12px;
		height: 100%;
		gap: 16px;
		font-size: 12px;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	}

	.status-item {
		display: flex;
		align-items: center;
		white-space: nowrap;
	}

	.error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
		color: #d32f2f;
	}
</style>
