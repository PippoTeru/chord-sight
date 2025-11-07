<script lang="ts">
	import {
		settings,
		isSettingsOpen,
		closeSettings,
		toggleSettings,
		setVolume,
		setTranspose,
		selectMidiDevice,
		toggleVisualFeedback,
		toggleSustainIndicator,
		setThemeMode,
		resetSettings,
		isDarkMode,
		type ThemeMode,
	} from '$lib/stores/settingsStore';
	import { getAudioEngine } from '$lib/stores/audioStore';
	import { settings as chordSettings } from '$lib/stores/settings.svelte';
	import type { AccidentalNotation } from '$lib/stores/settings.svelte';

	/**
	 * MIDIデバイス一覧を取得
	 */
	let midiDevices: Array<{ id: string; name: string }> = [];

	$: {
		const engine = getAudioEngine();
		const midiState = engine.getMIDIState();
		if (midiState) {
			midiDevices = midiState.activeDevices.map((d) => ({
				id: d.id,
				name: d.name,
			}));
		}
	}

	/**
	 * オーバーレイクリックで閉じる
	 */
	function handleOverlayClick() {
		closeSettings();
	}

	/**
	 * パネル内クリックは伝播を止める
	 */
	function handlePanelClick(event: MouseEvent) {
		event.stopPropagation();
	}
</script>

<!-- 設定ボタン（常に表示） -->
<button
	class="settings-button"
	class:open={$isSettingsOpen}
	class:dark={$isDarkMode}
	on:click={toggleSettings}
	aria-label="Toggle settings"
>
	⚙️
</button>

{#if $isSettingsOpen}
	<!-- オーバーレイ -->
	<div class="overlay" on:click={handleOverlayClick} role="presentation"></div>
{/if}

<!-- 設定パネル -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="settings-panel" class:open={$isSettingsOpen} class:dark={$isDarkMode} on:click={handlePanelClick} role="dialog" aria-label="Settings">
	<!-- ヘッダー -->
	<div class="header">
		<h2>Settings</h2>
		<button class="close-button" on:click={closeSettings} aria-label="Close settings">
			✕
		</button>
	</div>

	<!-- コンテンツ -->
	<div class="content">
		<!-- オーディオ設定 -->
		<section>
			<h3>Audio</h3>

			<!-- ボリューム -->
			<div class="setting-item">
				<label for="volume">
					Volume
					<span class="value">{$settings.volume}%</span>
				</label>
				<input
					id="volume"
					type="range"
					min="0"
					max="100"
					step="1"
					value={$settings.volume}
					on:input={(e) => setVolume(Number(e.currentTarget.value))}
				/>
			</div>

			<!-- トランスポーズ -->
			<div class="setting-item">
				<label for="transpose">
					Transpose
					<span class="value">{$settings.transpose > 0 ? '+' : ''}{$settings.transpose}</span>
				</label>
				<div class="transpose-controls">
					<button
						class="transpose-btn"
						on:click={() => setTranspose($settings.transpose - 1)}
						disabled={$settings.transpose <= -12}
						aria-label="Decrease transpose"
					>
						◀
					</button>
					<input
						id="transpose"
						type="range"
						min="-12"
						max="12"
						step="1"
						value={$settings.transpose}
						on:input={(e) => setTranspose(Number(e.currentTarget.value))}
					/>
					<button
						class="transpose-btn"
						on:click={() => setTranspose($settings.transpose + 1)}
						disabled={$settings.transpose >= 12}
						aria-label="Increase transpose"
					>
						▶
					</button>
				</div>
			</div>
		</section>

		<!-- MIDI設定 -->
		<section>
			<h3>MIDI</h3>

			<!-- MIDIデバイス選択 -->
			<div class="setting-item">
				<label for="midi-device">MIDI Device</label>
				<select
					id="midi-device"
					value={$settings.selectedMidiDeviceId ?? ''}
					on:change={(e) => selectMidiDevice(e.currentTarget.value || null)}
				>
					<option value="">All Devices</option>
					{#each midiDevices as device}
						<option value={device.id}>{device.name}</option>
					{/each}
				</select>
			</div>
		</section>

		<!-- 表示設定 -->
		<section>
			<h3>Display</h3>

			<!-- テーマモード -->
			<div class="setting-item">
				<label for="theme-mode">Theme</label>
				<select
					id="theme-mode"
					value={$settings.themeMode}
					on:change={(e) => setThemeMode(e.currentTarget.value as ThemeMode)}
				>
					<option value="system">System</option>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
				</select>
			</div>

			<!-- 臨時記号表記 -->
			<div class="setting-item">
				<label for="accidental-notation">Accidental Notation</label>
				<select
					id="accidental-notation"
					value={chordSettings.accidentalNotation}
					on:change={(e) => chordSettings.setAccidentalNotation(e.currentTarget.value as AccidentalNotation)}
				>
					<option value="sharp"># (Sharp)</option>
					<option value="flat">♭ (Flat)</option>
				</select>
			</div>

			<!-- 視覚的フィードバック -->
			<div class="setting-item checkbox-item">
				<label>
					<input
						type="checkbox"
						checked={$settings.visualFeedbackEnabled}
						on:change={toggleVisualFeedback}
					/>
					Visual Feedback
				</label>
			</div>

			<!-- サステインインジケーター -->
			<div class="setting-item checkbox-item">
				<label>
					<input
						type="checkbox"
						checked={$settings.sustainIndicatorEnabled}
						on:change={toggleSustainIndicator}
					/>
					Sustain Pedal Indicator
				</label>
			</div>
		</section>

		<!-- リセットボタン -->
		<section>
			<button class="reset-button" on:click={resetSettings}>
				Reset to Defaults
			</button>
		</section>
	</div>
</div>

<style>
	.settings-button {
		position: fixed;
		top: 20px;
		right: 0;
		background: white;
		border: 2px solid #ddd;
		border-right: none;
		border-radius: 8px 0 0 8px;
		padding: 12px 16px;
		font-size: 1.5rem;
		cursor: pointer;
		box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.1);
		transition: all 0.3s ease;
		z-index: 1002;
	}

	.settings-button.dark {
		background: #2d2d2d;
		border-color: #555;
		color: #e0e0e0;
	}

	.settings-button:hover {
		background-color: #f5f5f5;
		border-color: #4caf50;
		box-shadow: -4px 4px 12px rgba(0, 0, 0, 0.2);
	}

	.settings-button.dark:hover {
		background-color: #3a3a3a;
	}

	.settings-button.open {
		right: 320px;
	}

	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.settings-panel {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 320px;
		background-color: white;
		box-shadow: -2px 0 8px rgba(0, 0, 0, 0.2);
		z-index: 1001;
		display: flex;
		flex-direction: column;
		transform: translateX(100%);
		transition: transform 0.3s ease, background-color 0.3s ease, color 0.3s ease;
		pointer-events: none;
	}

	.settings-panel.dark {
		background-color: #2d2d2d;
		color: #e0e0e0;
	}

	.settings-panel.open {
		transform: translateX(0);
		pointer-events: auto;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.settings-panel.dark .header {
		border-bottom-color: #444;
	}

	.header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #333;
	}

	.settings-panel.dark .header h2 {
		color: #e0e0e0;
	}

	.close-button {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #666;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		line-height: 1;
		transition: color 0.2s;
	}

	.settings-panel.dark .close-button {
		color: #999;
	}

	.close-button:hover {
		color: #333;
	}

	.settings-panel.dark .close-button:hover {
		color: #e0e0e0;
	}

	.content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	/* スクロールバーのスタイル（ライトモード） */
	.content::-webkit-scrollbar {
		width: 8px;
	}

	.content::-webkit-scrollbar-track {
		background: #f5f5f5;
	}

	.content::-webkit-scrollbar-thumb {
		background: #ccc;
		border-radius: 4px;
	}

	.content::-webkit-scrollbar-thumb:hover {
		background: #aaa;
	}

	/* スクロールバーのスタイル（ダークモード） */
	.settings-panel.dark .content::-webkit-scrollbar-track {
		background: #1a1a1a;
	}

	.settings-panel.dark .content::-webkit-scrollbar-thumb {
		background: #555;
	}

	.settings-panel.dark .content::-webkit-scrollbar-thumb:hover {
		background: #666;
	}

	section {
		margin-bottom: 2rem;
	}

	section:last-child {
		margin-bottom: 0;
	}

	h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.settings-panel.dark h3 {
		color: #999;
	}

	.setting-item {
		margin-bottom: 1.5rem;
	}

	.setting-item:last-child {
		margin-bottom: 0;
	}

	label {
		display: block;
		font-size: 0.9rem;
		font-weight: 500;
		color: #333;
		margin-bottom: 0.5rem;
	}

	.settings-panel.dark label {
		color: #e0e0e0;
	}

	.value {
		float: right;
		color: #4caf50;
		font-weight: 600;
	}

	.transpose-controls {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.transpose-btn {
		background: #f5f5f5;
		border: 1px solid #ddd;
		border-radius: 4px;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 12px;
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.settings-panel.dark .transpose-btn {
		background: #1a1a1a;
		border-color: #555;
		color: #e0e0e0;
	}

	.transpose-btn:hover:not(:disabled) {
		background: #e0e0e0;
		border-color: #4caf50;
	}

	.settings-panel.dark .transpose-btn:hover:not(:disabled) {
		background: #333;
	}

	.transpose-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.transpose-controls input[type='range'] {
		flex: 1;
	}

	input[type='range'] {
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: #e0e0e0;
		outline: none;
		-webkit-appearance: none;
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #4caf50;
		cursor: pointer;
		transition: background 0.2s;
	}

	input[type='range']::-webkit-slider-thumb:hover {
		background: #45a049;
	}

	input[type='range']::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #4caf50;
		cursor: pointer;
		border: none;
		transition: background 0.2s;
	}

	input[type='range']::-moz-range-thumb:hover {
		background: #45a049;
	}

	select {
		width: 100%;
		padding: 0.5rem;
		font-size: 0.9rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: white;
		color: #333;
		cursor: pointer;
		transition: border-color 0.2s, background-color 0.3s ease, color 0.3s ease;
	}

	.settings-panel.dark select {
		background-color: #1a1a1a;
		border-color: #555;
		color: #e0e0e0;
	}

	select:hover {
		border-color: #4caf50;
	}

	select:focus {
		outline: none;
		border-color: #4caf50;
	}

	.checkbox-item label {
		display: flex;
		align-items: center;
		cursor: pointer;
		margin-bottom: 0;
	}

	input[type='checkbox'] {
		width: 18px;
		height: 18px;
		margin-right: 0.75rem;
		cursor: pointer;
		accent-color: #4caf50;
	}

	.reset-button {
		width: 100%;
		padding: 0.75rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: #666;
		background-color: #f5f5f5;
		border: 1px solid #ddd;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.settings-panel.dark .reset-button {
		background-color: #1a1a1a;
		border-color: #555;
		color: #999;
	}

	.reset-button:hover {
		background-color: #e0e0e0;
		color: #333;
	}

	.settings-panel.dark .reset-button:hover {
		background-color: #333;
		color: #e0e0e0;
	}
</style>
