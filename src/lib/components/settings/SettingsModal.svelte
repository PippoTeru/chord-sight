<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { midiStore } from '$lib/stores/midiStore.svelte';
	import { onMount } from 'svelte';
	import SettingsDisplay from './SettingsDisplay.svelte';

	let dialogElement = $state<HTMLDialogElement | undefined>();

	// モーダルの開閉状態に応じてdialog要素を制御
	$effect(() => {
		if (settingsStore.isSettingsOpen && dialogElement) {
			dialogElement.showModal();
			// 設定モーダルを開いている間はMIDI入力を一時停止
			const midiManager = midiStore.getMIDIManager();
			if (midiManager) {
				midiManager.pause();
			}
		} else if (!settingsStore.isSettingsOpen && dialogElement?.open) {
			dialogElement.close();
			// 設定モーダルを閉じたらMIDI入力を再開
			const midiManager = midiStore.getMIDIManager();
			if (midiManager) {
				midiManager.resume();
			}
		}
	});

	function handleClose() {
		settingsStore.closeSettings();
	}

	/**
	 * グローバルキーボードイベント（'s'キー）
	 */
	function handleGlobalKeyDown(event: KeyboardEvent) {
		// 's'キーで設定モーダルをトグル（input/select要素でのタイプ中は無視）
		if (event.key === 's' || event.key === 'S') {
			const target = event.target as HTMLElement;
			const isTyping =
				target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';
			if (!isTyping) {
				event.preventDefault();
				settingsStore.toggleSettings();
			}
		}
	}

	/**
	 * グローバルキーボードリスナーを登録
	 */
	onMount(() => {
		window.addEventListener('keydown', handleGlobalKeyDown);
		return () => {
			window.removeEventListener('keydown', handleGlobalKeyDown);
		};
	});
</script>

<dialog bind:this={dialogElement} onclose={handleClose} class:dark={settingsStore.isDarkMode}>
	<div class="modal-content">
		<!-- ヘッダー -->
		<header class="modal-header">
			<h2>Settings</h2>
			<button class="close-button" onclick={handleClose} aria-label="Close">✕</button>
		</header>

		<!-- コンテンツ -->
		<div class="modal-body" class:dark={settingsStore.isDarkMode}>
			<SettingsDisplay isOpen={settingsStore.isSettingsOpen} isDark={settingsStore.isDarkMode} />
		</div>

		<!-- フッター（Reset to Defaults） -->
		<footer class="modal-footer">
			<button
				class="reset-button"
				onclick={() => settingsStore.resetSettings()}
				tabindex={settingsStore.isSettingsOpen ? 0 : -1}
				aria-label="Reset all settings to default values"
			>
				Reset to Defaults
			</button>
		</footer>
	</div>
</dialog>

<style>
	dialog {
		border: none;
		border-radius: 12px;
		padding: 0;
		max-width: 600px;
		width: 90vw;
		max-height: 85vh;
		background: var(--bg-secondary);
		color: var(--text-primary);
		box-shadow: var(--shadow-lg);
		margin: auto;
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(2px);
	}

	.modal-content {
		display: flex;
		flex-direction: column;
		max-height: 85vh;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 2px solid var(--border-primary);
		transition: border-color var(--transition-normal);
		flex-shrink: 0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		transition: color var(--transition-normal);
	}

	.close-button {
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		color: var(--text-secondary);
		border-radius: 6px;
		transition: all var(--transition-fast);
	}

	.close-button:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.close-button:focus {
		outline: none;
	}

	.close-button:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

	/* スクロールバーのスタイル */
	.modal-body::-webkit-scrollbar {
		width: 10px;
	}

	.modal-body::-webkit-scrollbar-track {
		background: transparent;
	}

	.modal-body::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 5px;
		border: 2px solid transparent;
		background-clip: padding-box;
	}

	.modal-body::-webkit-scrollbar-thumb:hover {
		background: rgba(0, 0, 0, 0.3);
		background-clip: padding-box;
	}

	/* ダークモード用スクロールバー */
	.modal-body.dark::-webkit-scrollbar-thumb {
		background: #888;
		border-radius: 5px;
		border: 2px solid transparent;
		background-clip: padding-box;
	}

	.modal-body.dark::-webkit-scrollbar-thumb:hover {
		background: #aaa;
		background-clip: padding-box;
	}

	.modal-footer {
		padding: 1rem 1.5rem;
		border-top: 2px solid var(--border-primary);
		background: var(--bg-tertiary);
		flex-shrink: 0;
	}

	.reset-button {
		width: 100%;
		padding: 0.75rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: #fff;
		background-color: #d32f2f;
		border: 1px solid #b71c1c;
		border-radius: 6px;
		cursor: pointer;
		transition: all var(--transition-fast);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.reset-button:hover {
		background-color: #c62828;
		border-color: #8e0000;
		box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3);
	}

	.reset-button:focus {
		outline: none;
	}

	.reset-button:focus-visible {
		outline: 2px solid #d32f2f;
		outline-offset: 2px;
	}
</style>
