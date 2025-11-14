<!--
  カスタムドロップダウンコンポーネント（汎用版）
-->
<script lang="ts" generics="T extends string">
	import { settingsStore } from '$lib/stores';

	interface Props {
		value?: T | null;
		options: T[] | readonly { value: T; label: string }[];
		onchange: (value: T) => void;
		placeholder?: string;
		disabled?: boolean;
	}

	let { value = $bindable(null), options, onchange, placeholder = '選択してください', disabled = false }: Props = $props();

	let isOpen = $state(false);
	let dropdownRef: HTMLDivElement | null = $state(null);
	let buttonRef: HTMLButtonElement | null = $state(null);
	let menuRef: HTMLUListElement | null = $state(null);
	let menuPosition = $state({ top: 0, left: 0, width: 0 });

	// optionsが配列かオブジェクト配列かを判定
	const isObjectArray = $derived(options.length > 0 && typeof options[0] === 'object');

	// メニューの位置を計算
	function updateMenuPosition() {
		if (buttonRef) {
			const rect = buttonRef.getBoundingClientRect();
			menuPosition = {
				top: rect.bottom,
				left: rect.left,
				width: rect.width
			};
		}
	}

	// 値からラベルを取得
	function getLabel(val: T | null): string {
		if (!val) return placeholder;
		if (isObjectArray) {
			const option = (options as readonly { value: T; label: string }[]).find(o => o.value === val);
			return option?.label ?? val;
		}
		return val;
	}

	// オプションの値を取得
	function getOptionValue(option: T | { value: T; label: string }): T {
		return typeof option === 'object' ? option.value : option;
	}

	// オプションのラベルを取得
	function getOptionLabel(option: T | { value: T; label: string }): string {
		return typeof option === 'object' ? option.label : option;
	}

	// ラベルを♭対応のHTML要素に変換
	function formatLabelWithAccidentals(label: string): string {
		// ♭を前後の余白を詰めるspanで囲む
		return label.replace(/♭/g, '<span class="flat">♭</span>');
	}

	// ドロップダウンを開閉
	function toggleDropdown() {
		if (!disabled) {
			if (!isOpen) {
				updateMenuPosition();
			}
			isOpen = !isOpen;
		}
	}

	// 選択肢をクリック
	function selectOption(option: T | { value: T; label: string }) {
		const optionValue = getOptionValue(option);
		value = optionValue;
		onchange(optionValue);
		isOpen = false;
	}

	// 外部クリックでドロップダウンを閉じる
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Node;
		const isClickInsideButton = dropdownRef && dropdownRef.contains(target);
		const isClickInsideMenu = menuRef && menuRef.contains(target);

		if (!isClickInsideButton && !isClickInsideMenu) {
			isOpen = false;
		}
	}

	// キーボード操作
	function handleKeydown(event: KeyboardEvent) {
		if (disabled) return;

		if (event.key === 'Escape') {
			isOpen = false;
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleDropdown();
		} else if (event.key === 'ArrowDown' && isOpen) {
			event.preventDefault();
			// 次の選択肢にフォーカス移動（実装省略）
		} else if (event.key === 'ArrowUp' && isOpen) {
			event.preventDefault();
			// 前の選択肢にフォーカス移動（実装省略）
		}
	}

	// メニューをbodyまたはdialog要素に追加・削除
	$effect(() => {
		if (isOpen && menuRef) {
			// 親がdialog要素内にあるかチェック
			const parentDialog = dropdownRef?.closest('dialog');
			const container = parentDialog || document.body;

			// メニューをコンテナに追加
			container.appendChild(menuRef);
		}

		return () => {
			// クリーンアップ: メニューを削除
			if (menuRef && menuRef.parentNode) {
				menuRef.parentNode.removeChild(menuRef);
			}
		};
	});

	// コンポーネントマウント時にイベントリスナーを追加
	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
		} else {
			document.removeEventListener('click', handleClickOutside);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="custom-dropdown" class:dark={settingsStore.isDarkMode} bind:this={dropdownRef}>
	<!-- ドロップダウンボタン -->
	<button
		bind:this={buttonRef}
		class="dropdown-button"
		class:open={isOpen}
		class:disabled={disabled}
		onclick={toggleDropdown}
		onkeydown={handleKeydown}
		type="button"
		aria-haspopup="listbox"
		aria-expanded={isOpen}
	>
		<span class="selected-value">
			{@html formatLabelWithAccidentals(getLabel(value))}
		</span>
		<span class="arrow" class:open={isOpen}>▼</span>
	</button>
</div>

{#if typeof document !== 'undefined'}
	<!-- ドロップダウンメニュー（body直下に配置） -->
	{#if isOpen}
		<ul
			bind:this={menuRef}
			class="dropdown-menu"
			class:dark={settingsStore.isDarkMode}
			role="listbox"
			style="top: {menuPosition.top}px; left: {menuPosition.left}px; width: {menuPosition.width}px;"
		>
			{#each options as option}
				<li
					class="dropdown-option"
					class:selected={value === getOptionValue(option)}
					role="option"
					aria-selected={value === getOptionValue(option)}
					onclick={() => selectOption(option)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectOption(option); } }}
				>
					{@html formatLabelWithAccidentals(getOptionLabel(option))}
				</li>
			{/each}
		</ul>
	{/if}
{/if}

<style>
	.custom-dropdown {
		position: relative;
		width: 100%;
	}

	.dropdown-button {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: white;
		color: #333;
		cursor: pointer;
		transition: border-color 0.2s, background-color 0.3s ease, color 0.3s ease;
		display: flex;
		justify-content: space-between;
		align-items: center;
		text-align: left;
	}

	.dropdown-button:hover:not(.disabled) {
		border-color: #4caf50;
	}

	.dropdown-button:focus {
		outline: none;
	}

	.dropdown-button:focus-visible {
		outline: 2px solid #4caf50;
		outline-offset: 2px;
		border-color: #4caf50;
	}

	.dropdown-button.open {
		border-color: #4caf50;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	.dropdown-button.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.selected-value {
		flex: 1;
	}

	.arrow {
		font-size: 0.7rem;
		transition: transform 0.2s;
		margin-left: 0.5rem;
	}

	.arrow.open {
		transform: rotate(180deg);
	}

	.dropdown-menu {
		position: fixed;
		max-height: 300px;
		overflow-y: auto;
		background-color: white;
		border: 1px solid #4caf50;
		border-bottom-left-radius: 4px;
		border-bottom-right-radius: 4px;
		list-style: none;
		margin: 0;
		padding: 0;
		z-index: 99999;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.dropdown-option {
		padding: 0.25rem 0.75rem;
		font-size: 0.9rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		color: #333;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.dropdown-option :global(.flat),
	.selected-value :global(.flat) {
		margin-left: -0.25em;
		margin-right: -0.25em;
		display: inline-block;
		font-size: 0.9em;
	}

	.dropdown-option:hover {
		background-color: #e3f2fd;
		color: #333;
	}

	.dropdown-option.selected {
		background-color: #0078d4;
		color: white;
	}

	.dropdown-option.selected:hover {
		background-color: #005a9e;
		color: white;
	}

	/* スクロールバーのスタイリング（ライトモード） */
	.dropdown-menu::-webkit-scrollbar {
		width: 8px;
	}

	.dropdown-menu::-webkit-scrollbar-track {
		background-color: #f0f0f0;
		border-bottom-right-radius: 4px;
	}

	.dropdown-menu::-webkit-scrollbar-thumb {
		background-color: #c0c0c0;
		border-radius: 4px;
	}

	.dropdown-menu::-webkit-scrollbar-thumb:hover {
		background-color: #a0a0a0;
	}

	/* Firefox用スクロールバー */
	.dropdown-menu {
		scrollbar-width: thin;
		scrollbar-color: #c0c0c0 #f0f0f0;
	}

	/* ダークモード対応 */
	.dark .dropdown-button {
		background-color: #1a1a1a;
		color: #e0e0e0;
		border-color: #555;
	}

	.dark .dropdown-button:hover:not(.disabled) {
		border-color: #4caf50;
	}

	.dark .dropdown-button:focus-visible {
		outline: 2px solid #4caf50;
		outline-offset: 2px;
		border-color: #4caf50;
	}

	.dark .dropdown-button.open {
		border-color: #4caf50;
	}

	.dropdown-menu.dark {
		background-color: #1a1a1a;
		border-color: #4caf50;
	}

	.dropdown-menu.dark .dropdown-option {
		color: #e0e0e0;
	}

	.dropdown-menu.dark .dropdown-option:hover {
		background-color: #2d2d2d;
		color: #e0e0e0;
	}

	.dropdown-menu.dark .dropdown-option.selected {
		background-color: #0078d4;
		color: white;
	}

	.dropdown-menu.dark .dropdown-option.selected:hover {
		background-color: #005a9e;
		color: white;
	}

	/* ダークモード用スクロールバー */
	.dropdown-menu.dark::-webkit-scrollbar-track {
		background-color: #1a1a1a;
	}

	.dropdown-menu.dark::-webkit-scrollbar-thumb {
		background-color: #555;
	}

	.dropdown-menu.dark::-webkit-scrollbar-thumb:hover {
		background-color: #666;
	}

	.dropdown-menu.dark {
		scrollbar-color: #555 #1a1a1a;
	}
</style>

