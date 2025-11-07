/**
 * Audio Store - AudioEngine状態管理
 *
 * AudioEngineのシングルトンインスタンスと状態を管理
 */

import { writable, derived } from 'svelte/store';
import { AudioEngine } from '$lib/services/audio/AudioEngine';
import type { AudioEngineState } from '$lib/services/audio/AudioEngine';
import { settings } from './settingsStore';

/**
 * AudioEngineのシングルトンインスタンス
 */
let audioEngineInstance: AudioEngine | null = null;

/**
 * AudioEngine状態ストア
 */
export const audioState = writable<AudioEngineState>({
  isLoading: false,
  isReady: false,
  error: null,
  midiEnabled: false,
  activeVoices: 0,
  loadingProgress: 0,
});

/**
 * アクティブな鍵盤状態（視覚的フィードバック用）
 */
export const activeKeys = writable<Set<number>>(new Set());

/**
 * サステインペダル状態
 */
export const sustainPedalDown = writable<boolean>(false);

/**
 * Derived: 初期化済みか
 */
export const isReady = derived(audioState, ($state) => $state.isReady);

/**
 * Derived: ロード中か
 */
export const isLoading = derived(audioState, ($state) => $state.isLoading);

/**
 * Derived: エラーあり
 */
export const hasError = derived(audioState, ($state) => $state.error !== null);

/**
 * AudioEngineを取得（初回はインスタンス作成）
 */
export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}

/**
 * AudioEngine初期化
 */
export async function initializeAudio(sf2Url: string = '/SalamanderGrandPiano-V3+20200602.sf2') {
  const engine = getAudioEngine();

  audioState.update((state) => ({ ...state, isLoading: true, error: null, loadingProgress: 0 }));

  const success = await engine.initialize({
    sf2Url,
    maxPolyphony: 64,
    cacheSize: 150,
    // ローディング進捗コールバック
    onProgress: (progress: number) => {
      audioState.update((state) => ({ ...state, loadingProgress: progress }));
    },
    // MIDI入力の視覚的フィードバック用コールバック
    onNoteOn: (midiNote: number, velocity: number) => {
      // 視覚的フィードバックが有効な場合のみ更新
      let visualEnabled = false;
      const unsubscribe = settings.subscribe(($settings) => {
        visualEnabled = $settings.visualFeedbackEnabled;
      });
      unsubscribe();

      if (visualEnabled) {
        activeKeys.update((keys) => {
          keys.add(midiNote);
          return keys;
        });
      }
    },
    onNoteOff: (midiNote: number) => {
      // 視覚的フィードバックが有効な場合のみ更新
      let visualEnabled = false;
      const unsubscribe = settings.subscribe(($settings) => {
        visualEnabled = $settings.visualFeedbackEnabled;
      });
      unsubscribe();

      if (visualEnabled) {
        activeKeys.update((keys) => {
          keys.delete(midiNote);
          return keys;
        });
      }
    },
    onSustainPedal: (isDown: boolean) => {
      sustainPedalDown.set(isDown);
    },
  });

  if (success) {
    audioState.set(engine.getState());

    // 状態を定期的に更新
    setInterval(() => {
      audioState.set(engine.getState());
    }, 100);
  } else {
    const state = engine.getState();
    audioState.set(state);
  }

  return success;
}

/**
 * Note On（MIDI番号で演奏）
 */
export async function playNote(midiNote: number, velocity: number = 100) {
  const engine = getAudioEngine();

  if (!engine.getState().isReady) {
    console.warn('AudioEngine not ready');
    return;
  }

  await engine.playNote(midiNote, velocity);

  // アクティブキーに追加
  activeKeys.update((keys) => {
    keys.add(midiNote);
    return keys;
  });
}

/**
 * Note Off
 */
export function stopNote(midiNote: number) {
  const engine = getAudioEngine();

  if (!engine.getState().isReady) {
    return;
  }

  engine.stopNote(midiNote);

  // 視覚フィードバックを削除（実際のピアノと同じ挙動）
  // 鍵盤を離したら、ペダルの有無に関わらず視覚的には消える
  activeKeys.update((keys) => {
    keys.delete(midiNote);
    return keys;
  });
}

/**
 * サステインペダル設定
 */
export function setSustainPedal(isDown: boolean) {
  const engine = getAudioEngine();

  if (!engine.getState().isReady) {
    return;
  }

  engine.setSustainPedal(isDown);
  sustainPedalDown.set(isDown);
}

/**
 * 全ノート停止
 */
export function allNotesOff() {
  const engine = getAudioEngine();
  engine.allNotesOff();

  activeKeys.set(new Set());
}

/**
 * パニック（即座停止）
 */
export function panic() {
  const engine = getAudioEngine();
  engine.panic();

  activeKeys.set(new Set());
  sustainPedalDown.set(false);
}

/**
 * クリーンアップ
 */
export function disposeAudio() {
  if (audioEngineInstance) {
    audioEngineInstance.dispose();
    audioEngineInstance = null;
  }

  audioState.set({
    isLoading: false,
    isReady: false,
    error: null,
    midiEnabled: false,
    activeVoices: 0,
    loadingProgress: 0,
  });

  activeKeys.set(new Set());
  sustainPedalDown.set(false);
}
