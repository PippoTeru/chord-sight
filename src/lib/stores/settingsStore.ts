/**
 * Settings Store - アプリケーション設定の状態管理
 */

import { writable, derived } from 'svelte/store';
import { getAudioEngine } from './audioStore';

/**
 * テーマモード
 */
export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * 設定の型定義
 */
export interface Settings {
  // オーディオ設定
  volume: number; // 0-100
  transpose: number; // -12 ~ +12

  // MIDI設定
  selectedMidiDeviceId: string | null; // null = All Devices

  // 表示設定
  visualFeedbackEnabled: boolean;
  sustainIndicatorEnabled: boolean;
  themeMode: ThemeMode;
}

/**
 * デフォルト設定
 */
const defaultSettings: Settings = {
  volume: 100,
  transpose: 0,
  selectedMidiDeviceId: null, // All Devices
  visualFeedbackEnabled: true,
  sustainIndicatorEnabled: true,
  themeMode: 'system',
};

/**
 * 設定ストア
 */
export const settings = writable<Settings>(defaultSettings);

/**
 * 設定パネルの開閉状態
 */
export const isSettingsOpen = writable<boolean>(false);

/**
 * 設定を開く
 */
export function openSettings() {
  isSettingsOpen.set(true);
}

/**
 * 設定を閉じる
 */
export function closeSettings() {
  isSettingsOpen.set(false);
}

/**
 * 設定をトグル
 */
export function toggleSettings() {
  isSettingsOpen.update((open) => !open);
}

/**
 * ボリュームを設定
 */
export function setVolume(volume: number) {
  const normalizedVolume = Math.max(0, Math.min(100, volume));
  settings.update((s) => ({ ...s, volume: normalizedVolume }));

  // AudioEngineに反映
  try {
    const engine = getAudioEngine();
    engine.setVolume(normalizedVolume);
  } catch (error) {
    // AudioEngineがまだ初期化されていない場合は無視
  }
}

/**
 * トランスポーズを設定
 */
export function setTranspose(transpose: number) {
  const normalizedTranspose = Math.max(-12, Math.min(12, transpose));
  settings.update((s) => ({ ...s, transpose: normalizedTranspose }));

  // AudioEngineに反映
  try {
    const engine = getAudioEngine();
    engine.setTranspose(normalizedTranspose);
  } catch (error) {
    // AudioEngineがまだ初期化されていない場合は無視
  }
}

/**
 * MIDIデバイスを選択
 */
export function selectMidiDevice(deviceId: string | null) {
  settings.update((s) => ({ ...s, selectedMidiDeviceId: deviceId }));

  // AudioEngineに反映
  try {
    const engine = getAudioEngine();
    engine.selectMIDIDevice(deviceId);
  } catch (error) {
    // AudioEngineがまだ初期化されていない場合は無視
  }
}

/**
 * 視覚的フィードバックを切り替え
 */
export function toggleVisualFeedback() {
  settings.update((s) => {
    const newEnabled = !s.visualFeedbackEnabled;

    // OFFにする場合はactiveKeysをクリア
    if (!newEnabled) {
      // audioStoreからactiveKeysをインポートして使用
      import('./audioStore').then(({ activeKeys }) => {
        activeKeys.set(new Set());
      });
    }

    return { ...s, visualFeedbackEnabled: newEnabled };
  });
}

/**
 * サステインインジケーターを切り替え
 */
export function toggleSustainIndicator() {
  settings.update((s) => ({ ...s, sustainIndicatorEnabled: !s.sustainIndicatorEnabled }));
}

/**
 * テーマモードを設定
 */
export function setThemeMode(mode: ThemeMode) {
  settings.update((s) => ({ ...s, themeMode: mode }));
}

/**
 * 設定をリセット
 */
export function resetSettings() {
  settings.set(defaultSettings);
}

/**
 * システムのダークモード設定を取得
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * 実際に適用されるダークモード状態
 */
export const isDarkMode = derived(settings, ($settings) => {
  if ($settings.themeMode === 'system') {
    return getSystemTheme() === 'dark';
  }
  return $settings.themeMode === 'dark';
});
