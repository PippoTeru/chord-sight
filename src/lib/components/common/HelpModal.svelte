<script lang="ts">
	import { settingsStore } from '$lib/stores';

	let dialogElement = $state<HTMLDialogElement | undefined>();

	// モーダルの開閉状態に応じてdialog要素を制御
	$effect(() => {
		if (settingsStore.isHelpOpen && dialogElement) {
			dialogElement.showModal();
		} else if (!settingsStore.isHelpOpen && dialogElement?.open) {
			dialogElement.close();
		}
	});

	function handleClose() {
		settingsStore.closeHelp();
	}
</script>

<dialog bind:this={dialogElement} onclose={handleClose} class:dark={settingsStore.isDarkMode}>
	<div class="modal-content">
		<header class="modal-header">
			<h2>Help</h2>
			<button class="close-button" onclick={handleClose} aria-label="Close">✕</button>
		</header>

		<div class="modal-body">
			<p>Help content will be added here.</p>
		</div>
	</div>
</dialog>

<style>
	dialog {
		border: none;
		border-radius: 12px;
		padding: 0;
		max-width: 600px;
		width: 90vw;
		max-height: 80vh;
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
		height: 100%;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 2px solid var(--border-primary);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
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

	.close-button:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.modal-body p {
		margin: 0;
		color: var(--text-primary);
		line-height: 1.6;
	}
</style>
