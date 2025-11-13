/**
 * アプリケーション設定（統合版）
 * - Svelte 5 runes を使用
 * - ローカルストレージで永続化
 */

import {
	eventBus,
	EVENT_MIDI_DEVICE_SELECTED,
	EVENT_VISUAL_FEEDBACK_DISABLED,
	EVENT_SETTINGS_STORAGE_ERROR
} from '$lib/services';
import type { TonicNote, KeyMode } from '$lib/types';

export type ThemeMode = 'system' | 'light' | 'dark';
export type AccidentalNotation = 'sharp' | 'flat';
export type KeyboardDisplayMode = 'physical' | 'sustained';

interface SettingsData {
	// MIDI設定
	selectedMidiDeviceId: string | null;

	// 表示設定
	visualFeedbackEnabled: boolean;
	sustainIndicatorEnabled: boolean;
	keyboardDisplayMode: KeyboardDisplayMode;
	themeMode: ThemeMode;
	highlightColor: string;

	// コード設定
	accidentalNotation: AccidentalNotation;

	// ディグリー表記設定
	selectedTonic: TonicNote | null;
	selectedKeyMode: KeyMode;
	showDegreeNotation: boolean;
}

class Settings {
	// 設定値（$state runes）
	selectedMidiDeviceId = $state<string | null>(null);
	visualFeedbackEnabled = $state(true);
	sustainIndicatorEnabled = $state(true);
	keyboardDisplayMode = $state<KeyboardDisplayMode>('physical');
	themeMode = $state<ThemeMode>('system');
	highlightColor = $state('#888888');
	accidentalNotation = $state<AccidentalNotation>('sharp');

	// ディグリー表記設定
	selectedTonic = $state<TonicNote | null>(null);
	selectedKeyMode = $state<KeyMode>('major');
	showDegreeNotation = $state(false);

	// UI状態
	isSettingsOpen = $state(false);

	// 派生状態（$derived）
	isDarkMode = $derived.by(() => {
		if (this.themeMode === 'system') {
			return this.getSystemTheme() === 'dark';
		}
		return this.themeMode === 'dark';
	});

	constructor() {
		this.loadFromLocalStorage();
	}

	// ローカルストレージから読み込み
	private loadFromLocalStorage() {
		if (typeof window === 'undefined') return;

		try {
			const saved = localStorage.getItem('settings');
			if (saved) {
				const data = JSON.parse(saved) as Partial<SettingsData>;
				if (data.selectedMidiDeviceId !== undefined)
					this.selectedMidiDeviceId = data.selectedMidiDeviceId;
				if (data.visualFeedbackEnabled !== undefined)
					this.visualFeedbackEnabled = data.visualFeedbackEnabled;
				if (data.sustainIndicatorEnabled !== undefined)
					this.sustainIndicatorEnabled = data.sustainIndicatorEnabled;
				if (data.keyboardDisplayMode !== undefined)
					this.keyboardDisplayMode = data.keyboardDisplayMode;
				if (data.themeMode !== undefined) this.themeMode = data.themeMode;
				if (data.highlightColor !== undefined) this.highlightColor = data.highlightColor;
				if (data.accidentalNotation !== undefined)
					this.accidentalNotation = data.accidentalNotation;
				if (data.selectedTonic !== undefined) this.selectedTonic = data.selectedTonic;
				if (data.selectedKeyMode !== undefined) this.selectedKeyMode = data.selectedKeyMode;
				if (data.showDegreeNotation !== undefined)
					this.showDegreeNotation = data.showDegreeNotation;
			}
		} catch (error) {
			console.error('Failed to load settings from localStorage:', error);
			eventBus.emit(EVENT_SETTINGS_STORAGE_ERROR, {
				operation: 'load',
				error: error instanceof Error ? error : new Error(String(error))
			});
		}
	}

	// ローカルストレージに保存
	private saveToLocalStorage() {
		if (typeof window === 'undefined') return;

		const data: SettingsData = {
			selectedMidiDeviceId: this.selectedMidiDeviceId,
			visualFeedbackEnabled: this.visualFeedbackEnabled,
			sustainIndicatorEnabled: this.sustainIndicatorEnabled,
			keyboardDisplayMode: this.keyboardDisplayMode,
			themeMode: this.themeMode,
			highlightColor: this.highlightColor,
			accidentalNotation: this.accidentalNotation,
			selectedTonic: this.selectedTonic,
			selectedKeyMode: this.selectedKeyMode,
			showDegreeNotation: this.showDegreeNotation
		};

		try {
			localStorage.setItem('settings', JSON.stringify(data));
		} catch (error) {
			console.error('Failed to save settings to localStorage:', error);
			eventBus.emit(EVENT_SETTINGS_STORAGE_ERROR, {
				operation: 'save',
				error: error instanceof Error ? error : new Error(String(error))
			});
		}
	}

	// パネル開閉
	openSettings() {
		this.isSettingsOpen = true;
	}

	closeSettings() {
		this.isSettingsOpen = false;
	}

	toggleSettings() {
		this.isSettingsOpen = !this.isSettingsOpen;
	}

	// MIDIデバイス選択
	selectMidiDevice(deviceId: string | null) {
		this.selectedMidiDeviceId = deviceId;
		this.saveToLocalStorage();

		// MIDIManagerに反映（イベントバス経由）
		eventBus.emit(EVENT_MIDI_DEVICE_SELECTED, { deviceId });
	}

	// 視覚的フィードバック切り替え
	toggleVisualFeedback() {
		this.visualFeedbackEnabled = !this.visualFeedbackEnabled;
		this.saveToLocalStorage();

		// OFFの場合はactiveKeysをクリア（イベントバス経由）
		if (!this.visualFeedbackEnabled) {
			eventBus.emit(EVENT_VISUAL_FEEDBACK_DISABLED);
		}
	}

	// サステインインジケーター切り替え
	toggleSustainIndicator() {
		this.sustainIndicatorEnabled = !this.sustainIndicatorEnabled;
		this.saveToLocalStorage();
	}

	// テーマモード設定
	setThemeMode(mode: ThemeMode) {
		this.themeMode = mode;
		this.saveToLocalStorage();
	}

	// 臨時記号表記設定
	setAccidentalNotation(notation: AccidentalNotation) {
		this.accidentalNotation = notation;
		this.saveToLocalStorage();
	}

	// 鍵盤表示モード設定
	setKeyboardDisplayMode(mode: KeyboardDisplayMode) {
		this.keyboardDisplayMode = mode;
		this.saveToLocalStorage();
	}

	// ハイライト色設定
	setHighlightColor(color: string) {
		this.highlightColor = color;
		this.saveToLocalStorage();
	}

	// 設定リセット
	resetSettings() {
		this.selectedMidiDeviceId = null;
		this.visualFeedbackEnabled = true;
		this.sustainIndicatorEnabled = true;
		this.keyboardDisplayMode = 'physical';
		this.themeMode = 'system';
		this.highlightColor = '#888888';
		this.accidentalNotation = 'sharp';
		this.selectedTonic = null;
		this.selectedKeyMode = 'major';
		this.showDegreeNotation = false;
		this.saveToLocalStorage();
	}

	// 主音選択
	setSelectedTonic(tonic: TonicNote | null) {
		this.selectedTonic = tonic;
		this.saveToLocalStorage();
	}

	// キーモード選択
	setKeyMode(mode: KeyMode) {
		this.selectedKeyMode = mode;
		this.saveToLocalStorage();
	}

	// ディグリー表記ON/OFF
	toggleDegreeNotation() {
		this.showDegreeNotation = !this.showDegreeNotation;
		this.saveToLocalStorage();
	}

	// システムテーマ取得
	private getSystemTheme(): 'light' | 'dark' {
		if (typeof window === 'undefined') return 'light';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
}

export const settingsStore = new Settings();
