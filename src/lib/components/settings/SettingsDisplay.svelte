<script lang="ts">
	import { settingsStore, type KeyboardDisplayMode, type KeyHighlightMode, type ThemeMode } from '$lib/stores';
	import { midiStore } from '$lib/stores/midiStore.svelte';
	import CustomDropdown from '../common/CustomDropdown.svelte';

	interface Props {
		isOpen: boolean;
		isDark: boolean;
	}

	let { isOpen, isDark }: Props = $props();

	// Theme options
	const themeOptions = [
		{ value: 'system', label: 'System' },
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	] as const;

	// Keyboard display mode options
	const keyboardDisplayOptions = [
		{ value: 'physical', label: 'Physical (Ignore Sustain)' },
		{ value: 'sustained', label: 'Sustained (Follow Sustain Pedal)' }
	] as const;

	// Key highlight mode options
	const keyHighlightOptions = [
		{ value: 'original', label: 'Original (Actual Keys Pressed)' },
		{ value: 'transposed', label: 'Transposed (Follow Transpose)' }
	] as const;

	/**
	 * MIDIデバイス一覧を取得
	 */
	let midiDevices: Array<{ id: string; name: string }> = $state([]);

	// MIDI有効化とSettings開閉を監視してデバイス一覧を更新
	$effect(() => {
		if (midiStore.midiEnabled && isOpen) {
			const midiManager = midiStore.getMIDIManager();
			if (midiManager) {
				const midiState = midiManager.getState();
				midiDevices = midiState.activeDevices.map((d) => ({
					id: d.id,
					name: d.name,
				}));
			}
		}
	});

	/**
	 * ドロップダウン用のオプション配列を生成
	 */
	const deviceOptions = $derived([
		{ value: null, label: 'All Devices' },
		...midiDevices.map(d => ({ value: d.id, label: d.name }))
	] as const);
</script>

<section class:dark={isDark}>
	<!-- General -->
	<div class="setting-group">
		<h4 class="group-title">General</h4>

		<!-- テーマモード -->
		<div class="setting-item">
			<label for="theme-mode-select">Theme</label>
			<CustomDropdown
				id="theme-mode-select"
				bind:value={settingsStore.themeMode}
				options={themeOptions}
				onchange={(value) => settingsStore.setThemeMode(value as ThemeMode)}
			/>
		</div>

		<!-- MIDIデバイス選択 -->
		<div class="setting-item">
			<label for="midi-device-select">MIDI Device</label>
			<CustomDropdown
				id="midi-device-select"
				bind:value={settingsStore.selectedMidiDeviceId}
				options={deviceOptions}
				onchange={(value) => settingsStore.selectMidiDevice(value)}
				placeholder="All Devices"
			/>
		</div>
	</div>

	<!-- Keyboard Behavior -->
	<div class="setting-group">
		<h4 class="group-title">Keyboard Behavior</h4>

		<!-- 鍵盤表示モード -->
		<div class="setting-item">
			<label for="keyboard-display-mode-select">Keyboard Display Mode</label>
			<CustomDropdown
				id="keyboard-display-mode-select"
				bind:value={settingsStore.keyboardDisplayMode}
				options={keyboardDisplayOptions}
				onchange={(value) => settingsStore.setKeyboardDisplayMode(value as KeyboardDisplayMode)}
			/>
		</div>

		<!-- 鍵盤ハイライトモード -->
		<div class="setting-item">
			<label for="key-highlight-mode-select">Key Highlight Mode</label>
			<CustomDropdown
				id="key-highlight-mode-select"
				bind:value={settingsStore.keyHighlightMode}
				options={keyHighlightOptions}
				onchange={(value) => settingsStore.setKeyHighlightMode(value as KeyHighlightMode)}
			/>
		</div>
	</div>

	<!-- Visual Indicators -->
	<div class="setting-group">
		<h4 class="group-title">Visual Indicators</h4>

		<!-- 視覚的フィードバック -->
		<div class="setting-item checkbox-item">
			<label for="visual-feedback">
				<input
					id="visual-feedback"
					type="checkbox"
					checked={settingsStore.visualFeedbackEnabled}
					onchange={() => settingsStore.toggleVisualFeedback()}
					tabindex={isOpen ? 0 : -1}
				/>
				Visual Feedback
			</label>
		</div>

		<!-- サステインインジケーター -->
		<div class="setting-item checkbox-item">
			<label for="sustain-indicator">
				<input
					id="sustain-indicator"
					type="checkbox"
					checked={settingsStore.sustainIndicatorEnabled}
					onchange={() => settingsStore.toggleSustainIndicator()}
					tabindex={isOpen ? 0 : -1}
				/>
				Sustain Pedal Indicator
			</label>
		</div>

		<!-- ハイライト色 -->
		<div class="setting-item">
			<label for="highlight-color">Highlight Color</label>
			<div class="color-picker-wrapper">
				<input
					id="highlight-color"
					type="color"
					value={settingsStore.highlightColor}
					oninput={(e) => settingsStore.setHighlightColor(e.currentTarget.value)}
					tabindex={isOpen ? 0 : -1}
				/>
				<span class="color-value">{settingsStore.highlightColor}</span>
			</div>
		</div>
	</div>
</section>

<style>
	section {
		margin-bottom: 2rem;
	}


	.setting-group {
		margin-bottom: 2rem;
	}

	.setting-group:last-child {
		margin-bottom: 0;
	}

	.group-title {
		margin: 0 0 0.75rem 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.setting-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.setting-item:last-child {
		margin-bottom: 0;
	}

	.setting-item label {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.checkbox-item {
		flex-direction: row;
		align-items: center;
	}

	.checkbox-item label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		margin-bottom: 0;
	}

	input[type='checkbox'] {
		width: 18px;
		height: 18px;
		margin-right: 0;
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

	.color-picker-wrapper {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	input[type='color'] {
		width: 60px;
		height: 40px;
		border: 2px solid var(--border-primary);
		border-radius: 6px;
		cursor: pointer;
		padding: 0;
		background: none;
	}

	input[type='color']:focus {
		outline: none;
		border-color: var(--accent-primary);
	}

	input[type='color']::-webkit-color-swatch-wrapper {
		padding: 4px;
	}

	input[type='color']::-webkit-color-swatch {
		border: none;
		border-radius: 4px;
	}

	.color-value {
		font-size: 0.9rem;
		font-family: monospace;
		color: var(--text-secondary);
		font-weight: 500;
	}
</style>
