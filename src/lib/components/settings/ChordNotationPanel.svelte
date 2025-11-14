<script lang="ts">
	import { settingsStore, type KeyMode, type AccidentalNotation } from '$lib/stores';
	import { TONIC_NOTES } from '$lib/types';
	import CustomDropdown from '../common/CustomDropdown.svelte';

	interface Props {
		isDark: boolean;
	}

	let { isDark }: Props = $props();

	// Accidental notation options
	const accidentalOptions = [
		{ value: 'sharp', label: '♯' },
		{ value: 'flat', label: '♭' }
	] as const;

	// Key mode options
	const keyModeOptions = [
		{ value: 'major', label: 'Major' },
		{ value: 'minor', label: 'Minor' }
	] as const;
</script>

<!-- トグルボタン（常に表示） -->
<button
	class="toggle-button"
	class:open={settingsStore.isChordNotationPanelOpen}
	class:dark={isDark}
	onclick={() => settingsStore.toggleChordNotationPanel()}
	aria-label="Toggle chord settings panel"
	title="Chord Settings"
>
	<span class="button-icon">♪</span>
</button>

<!-- サイドパネル -->
<div
	class="panel"
	class:open={settingsStore.isChordNotationPanelOpen}
	class:dark={isDark}
	role="region"
	aria-label="Chord Settings Panel"
>
	<!-- ヘッダー -->
	<div class="header">
		<h3>Chord Settings</h3>
		<button
			class="close-button"
			onclick={() => settingsStore.closeChordNotationPanel()}
			aria-label="Close chord settings panel"
		>
			<span>✕</span>
		</button>
	</div>

	<!-- コンテンツ -->
	<div class="content">
		<div class="controls">
			<!-- トランスポーズ -->
			<div class="control-row">
				<label for="transpose">Transpose: <span class="transpose-value-inline">{settingsStore.transpose > 0 ? '+' : ''}{settingsStore.transpose}</span></label>
				<div class="transpose-controls">
					<button
						class="transpose-button"
						onclick={() => settingsStore.setTranspose(settingsStore.transpose - 1)}
						disabled={settingsStore.transpose <= -11}
						aria-label="Transpose down"
					>
						−
					</button>
					<input
						type="range"
						id="transpose"
						min="-11"
						max="11"
						step="1"
						value={settingsStore.transpose}
						oninput={(e) => settingsStore.setTranspose(Number(e.currentTarget.value))}
						class="transpose-slider"
					/>
					<button
						class="transpose-button"
						onclick={() => settingsStore.setTranspose(settingsStore.transpose + 1)}
						disabled={settingsStore.transpose >= 11}
						aria-label="Transpose up"
					>
						+
					</button>
				</div>
			</div>

			<!-- 臨時記号表記 -->
			<div class="control-row">
				<label for="accidental-notation-panel">Accidentals</label>
				<CustomDropdown
					bind:value={settingsStore.accidentalNotation}
					options={accidentalOptions}
					onchange={(value) => settingsStore.setAccidentalNotation(value as AccidentalNotation)}
				/>
			</div>

			<!-- ディグリー表記ON/OFF -->
			<div class="control-row checkbox">
				<label>
					<input
						type="checkbox"
						checked={settingsStore.showDegreeNotation}
						onchange={() => settingsStore.toggleDegreeNotation()}
					/>
					Degree Notation
				</label>
			</div>

			{#if settingsStore.showDegreeNotation}
				<!-- 主音選択 -->
				<div class="control-row">
					<label for="tonic-note-panel">Tonic</label>
					<CustomDropdown
						bind:value={settingsStore.selectedTonic}
						options={TONIC_NOTES}
						onchange={(value) => settingsStore.setSelectedTonic(value)}
						placeholder="None"
					/>
				</div>

				<!-- キーモード選択 -->
				<div class="control-row">
					<label for="key-mode-panel">Mode</label>
					<CustomDropdown
						bind:value={settingsStore.selectedKeyMode}
						options={keyModeOptions}
						onchange={(value) => settingsStore.setKeyMode(value as KeyMode)}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.toggle-button {
		position: absolute;
		bottom: 20px;
		right: 0;
		background: var(--bg-secondary);
		border: 2px solid var(--border-primary);
		border-right: none;
		border-radius: 8px 0 0 8px;
		padding: 12px 16px;
		cursor: pointer;
		box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.1);
		transition:
			transform var(--transition-normal),
			background-color var(--transition-normal),
			border-color var(--transition-normal),
			box-shadow var(--transition-normal);
		z-index: var(--z-chord-panel);
		display: flex;
		align-items: center;
		justify-content: center;
		will-change: transform;
	}

	.toggle-button .button-icon {
		font-size: 1.5rem;
		line-height: 1;
		display: block;
		color: var(--text-primary);
		transition: color var(--transition-normal);
	}

	.toggle-button:hover {
		background-color: var(--bg-tertiary);
		border-color: var(--accent-primary);
		box-shadow: -4px 4px 12px rgba(0, 0, 0, 0.2);
	}

	.toggle-button:focus {
		outline: none;
	}

	.toggle-button:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.toggle-button.open {
		transform: translateX(-320px);
	}

	.panel {
		position: absolute;
		bottom: 0;
		right: 0;
		height: auto;
		max-height: calc(100% - 40px); /* 親要素の高さ内に収める */
		width: 320px;
		background: var(--bg-secondary);
		border: 2px solid var(--border-primary);
		border-right: none;
		border-bottom: none;
		border-top-left-radius: 12px;
		box-shadow: -2px -2px 8px rgba(0, 0, 0, 0.2);
		z-index: var(--z-chord-panel);
		display: flex;
		flex-direction: column;
		transform: translateX(100%);
		transition:
			transform var(--transition-normal),
			background-color var(--transition-normal),
			border-color var(--transition-normal);
		pointer-events: none;
		will-change: transform;
	}

	.panel.open {
		transform: translateX(0);
		pointer-events: auto;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border-primary);
		transition: border-color var(--transition-normal);
	}

	.header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		transition: color var(--transition-normal);
	}

	.close-button {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color var(--transition-fast);
		border-radius: 4px;
	}

	.close-button:hover {
		color: var(--text-primary);
		background: var(--bg-tertiary);
	}

	.close-button:focus {
		outline: none;
	}

	.close-button:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 0;
		border-radius: 4px;
	}

	.content {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem;
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.control-row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.control-row.checkbox {
		flex-direction: row;
		align-items: center;
	}

	.control-row label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-primary);
		transition: color var(--transition-normal);
	}

	.checkbox label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	input[type='checkbox'] {
		width: 16px;
		height: 16px;
		cursor: pointer;
		accent-color: var(--accent-primary);
	}

	input[type='checkbox']:focus {
		outline: none;
	}

	input[type='checkbox']:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* トランスポーズコントロール */
	.transpose-value-inline {
		font-weight: 600;
		font-family: monospace;
		color: var(--accent-primary);
		margin-left: 0.25rem;
	}

	.transpose-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.transpose-button {
		width: 32px;
		height: 32px;
		flex-shrink: 0;
		border: 1px solid var(--border-primary);
		border-radius: 4px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		font-weight: 600;
		transition: all var(--transition-fast);
	}

	.transpose-button:hover:not(:disabled) {
		background: var(--bg-tertiary);
		border-color: var(--accent-primary);
	}

	.transpose-button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.transpose-button:focus {
		outline: none;
	}

	.transpose-button:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.transpose-slider {
		flex: 1;
		height: 6px;
		-webkit-appearance: none;
		appearance: none;
		background: linear-gradient(
			to right,
			var(--border-primary) 0%,
			var(--border-primary) 50%,
			var(--border-primary) 100%
		);
		border-radius: 3px;
		outline: none;
		cursor: pointer;
	}

	.transpose-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		background: var(--accent-primary);
		border-radius: 50%;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.transpose-slider::-webkit-slider-thumb:hover {
		transform: scale(1.2);
		box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.2);
	}

	.transpose-slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		background: var(--accent-primary);
		border: none;
		border-radius: 50%;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.transpose-slider::-moz-range-thumb:hover {
		transform: scale(1.2);
		box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.2);
	}

	.transpose-slider:focus {
		outline: none;
	}

	.transpose-slider:focus-visible::-webkit-slider-thumb {
		box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.4);
	}

	.transpose-slider:focus-visible::-moz-range-thumb {
		box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.4);
	}

	/* スクロールバーのスタイル */
	.content::-webkit-scrollbar {
		width: 8px;
	}

	.content::-webkit-scrollbar-track {
		background: var(--bg-primary);
	}

	.content::-webkit-scrollbar-thumb {
		background: var(--border-secondary);
		border-radius: 4px;
	}

	.content::-webkit-scrollbar-thumb:hover {
		background: var(--text-tertiary);
	}
</style>
