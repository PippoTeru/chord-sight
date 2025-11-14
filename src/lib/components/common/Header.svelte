<script lang="ts">
	import { settingsStore } from '$lib/stores';

	interface Props {
		isDark: boolean;
	}

	let { isDark }: Props = $props();
</script>

<header class="header" class:dark={isDark}>
	<div class="logo">
		<h1>ChordSight</h1>
	</div>

	<div class="actions">
		<button
			class="icon-button"
			onclick={() => settingsStore.openHelp()}
			aria-label="Help"
			title="Help"
		>
			<span>?</span>
		</button>
		<button
			class="icon-button"
			onclick={() => settingsStore.openSettings()}
			aria-label="Settings"
			title="Settings"
		>
			<span>⚙️</span>
		</button>
	</div>
</header>

<style>
	.header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 60px;
		background: var(--bg-secondary);
		border-bottom: 2px solid var(--border-primary);
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 1.5rem;
		z-index: var(--z-header);
		box-shadow: var(--shadow-sm);
		transition:
			background-color var(--transition-normal),
			border-color var(--transition-normal),
			box-shadow var(--transition-normal);
	}

	.logo h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		transition: color var(--transition-normal);
	}

	.actions {
		display: flex;
		gap: 0.75rem;
	}

	.icon-button {
		width: 40px;
		height: 40px;
		border: 2px solid var(--border-primary);
		border-radius: 8px;
		background: var(--bg-secondary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		transition: all var(--transition-fast);
		color: var(--text-primary);
	}

	.icon-button:hover {
		background: var(--bg-tertiary);
		border-color: var(--accent-primary);
	}

	.icon-button:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.icon-button:active {
		transform: scale(0.95);
	}
</style>
