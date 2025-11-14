<script lang="ts">
	import { VirtualKeyboard } from "$lib/components/keyboard";
	import { SettingsModal, ChordNotationPanel } from "$lib/components/settings";
	import { ChordDisplay, NoteDisplay } from "$lib/components/display";
	import { Header, StatusBar, HelpModal, Notification } from "$lib/components/common";
	import { settingsStore } from "$lib/stores";
</script>

<main class="app-container">

	<!-- ヘッダー -->
	<Header isDark={settingsStore.isDarkMode} />

	<!-- 上部エリア（コード表示） -->
	<div class="content-area" class:dark={settingsStore.isDarkMode}>
		<!-- コード表示と音名表示 -->
		<div class="display-area">
			<ChordDisplay />
			<NoteDisplay />
		</div>

		<!-- コード表記パネル（右下） -->
		<ChordNotationPanel isDark={settingsStore.isDarkMode} />
	</div>

	<!-- 鍵盤エリア -->
	<div class="keyboard-area" class:dark={settingsStore.isDarkMode}>
		<VirtualKeyboard />
	</div>

	<!-- ステータスバー -->
	<StatusBar />

	<!-- 設定モーダル -->
	<SettingsModal />

	<!-- ヘルプモーダル -->
	<HelpModal />

	<!-- 通知トースト -->
	<Notification />
</main>

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
		background: var(--bg-primary);
		color: var(--text-primary);
		padding-top: 60px; /* ヘッダーの高さ分 */
		transition:
			background-color var(--transition-normal),
			color var(--transition-normal);
		overflow: hidden;
	}

	.display-area {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		width: 100%;
	}

	.keyboard-area {
		flex-shrink: 0;
		background: var(--bg-primary);
		transition: background-color var(--transition-normal);
	}
</style>
