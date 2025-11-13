<script lang="ts">
	import { settingsStore } from '$lib/stores';
</script>

<div class="status-bar" class:dark={settingsStore.isDarkMode} role="status">
	<div class="status-content">
		<span class="status-item">
			🎹 ChordSight
		</span>
	</div>
</div>

<style>
	.status-bar {
		flex-shrink: 0;
		height: 25px;
		background: var(--bg-tertiary);
		color: var(--text-primary);
		position: relative;
		overflow: hidden;
		border-top: 1px solid var(--border-secondary);
		transition:
			background-color var(--transition-normal),
			color var(--transition-normal),
			border-color var(--transition-normal);
		padding: 0;
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
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.status-item {
		display: flex;
		align-items: center;
		justify-content: center;
		white-space: nowrap;
		line-height: 1;
	}
</style>
