<script lang="ts">
	import '../css/reset.css';
	import { onMount } from 'svelte';
	import { registerServiceWorker } from '$lib/utils/serviceWorkerRegistration';

	onMount(() => {
		// Service Workerを登録してSF2ファイルをキャッシュ
		registerServiceWorker();
	});
</script>

<slot />
