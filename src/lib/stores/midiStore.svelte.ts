/**
 * MIDI Store - MIDI入力とコード検出用の状態管理（Svelte 5 runes版）
 */

import { MIDIManager, eventBus, EVENT_MIDI_DEVICE_SELECTED, EVENT_VISUAL_FEEDBACK_DISABLED, EVENT_KEYBOARD_DISPLAY_MODE_CHANGED } from '$lib/services';
import { MIDIControlChange, type MIDIEvent } from '$lib/types';
import { settingsStore } from './settings.svelte';
import { SUSTAIN_PEDAL } from '$lib/constants';

/**
 * MIDIストアクラス
 * - Svelte 5 runes ($state, $derived) を使用
 * - 初期化ロジックを小さい関数に分割
 */
class MIDIStore {
	// パブリック状態（$state runes）
	activeKeys = $state<Set<number>>(new Set());
	sustainPedalDown = $state(false);
	midiEnabled = $state(false);

	// プライベート状態
	private midiManager: MIDIManager | null = null;
	private isSustainPedalDown = false;
	private sustainedKeys = new Set<number>();

	/**
	 * MIDI初期化（メイン関数）
	 */
	async initialize(): Promise<boolean> {
		try {
			this.midiManager = new MIDIManager();

			// リスナーセットアップ
			this.setupNoteOnListener();
			this.setupNoteOffListener();
			this.setupControlChangeListener();

			// MIDIマネージャー初期化
			const success = await this.midiManager.initialize();
			this.midiEnabled = success;

			if (!success) {
				console.error('MIDI initialization failed');
				return false;
			}

			// イベントバスリスナー登録
			this.setupEventListeners();

			return true;
		} catch (error) {
			console.error('MIDI initialization failed:', error);
			this.midiEnabled = false;
			return false;
		}
	}

	/**
	 * Note Onリスナーのセットアップ
	 * - 鍵盤が押されたときに activeKeys に追加
	 * - バウンシング対策：既に存在するキーは無視
	 */
	private setupNoteOnListener() {
		if (!this.midiManager) return;

		this.midiManager.on('noteon', (event: MIDIEvent) => {
			if (event.type !== 'noteon') return;

			const midiNote = event.note;

			// バウンシング対策：既に存在するキーは無視
			if (this.activeKeys.has(midiNote)) {
				return;
			}

			// 新しいキーを追加
			this.activeKeys.add(midiNote);
			this.activeKeys = new Set(this.activeKeys);

			// Note Onが来たら、sustainedKeysからは削除（実際に押されている）
			this.sustainedKeys.delete(midiNote);
		});
	}

	/**
	 * Note Offリスナーのセットアップ
	 * - Physical Mode: サステインペダルを無視して即座に削除
	 * - Sustained Mode: サステインペダルが押されている場合は保持
	 */
	private setupNoteOffListener() {
		if (!this.midiManager) return;

		this.midiManager.on('noteoff', (event: MIDIEvent) => {
			if (event.type !== 'noteoff') return;

			const midiNote = event.note;

			// Physical Mode: サステインペダルを無視して即座に削除
			if (settingsStore.keyboardDisplayMode === 'physical') {
				this.activeKeys.delete(midiNote);
				this.activeKeys = new Set(this.activeKeys);
			}
			// Sustained Mode: サステインペダルが押されている場合は保持
			else {
				if (!this.isSustainPedalDown) {
					this.activeKeys.delete(midiNote);
					this.activeKeys = new Set(this.activeKeys);
				} else {
					// サステインで保持する鍵盤として記録
					this.sustainedKeys.add(midiNote);
				}
			}
		});
	}

	/**
	 * Control Changeリスナーのセットアップ
	 * - サステインペダル（CC#64）の処理
	 * - ペダル離し時に sustainedKeys をクリア
	 */
	private setupControlChangeListener() {
		if (!this.midiManager) return;

		this.midiManager.on('cc', (event: MIDIEvent) => {
			if (event.type !== 'cc') return;
			if (event.controller !== MIDIControlChange.SustainPedal) return;

			// サステインペダルの状態更新
			const isDown = event.value >= SUSTAIN_PEDAL.THRESHOLD;
			const wasDown = this.isSustainPedalDown;

			// ローカル変数を同期的に更新
			this.isSustainPedalDown = isDown;
			// ストアも更新（UI表示用）
			this.sustainPedalDown = isDown;

			// Sustained Modeの場合のみ、ペダル離し時の処理を行う
			if (settingsStore.keyboardDisplayMode === 'sustained') {
				// ペダルが DOWN → UP に変化したときのみ、サステインで保持していたキーをクリア
				if (wasDown && !isDown) {
					// sustainedKeysが空でない場合のみactiveKeysを更新
					if (this.sustainedKeys.size > 0) {
						// サステインで保持されていた鍵盤だけを削除
						for (const note of this.sustainedKeys) {
							this.activeKeys.delete(note);
						}
						this.activeKeys = new Set(this.activeKeys);
					}

					// サステイン保持リストをクリア
					this.sustainedKeys.clear();
				}
			}
		});
	}

	/**
	 * イベントバスリスナーのセットアップ
	 * - MIDIデバイス選択イベント
	 * - 視覚的フィードバック無効化イベント
	 * - 鍵盤表示モード変更イベント
	 */
	private setupEventListeners() {
		// MIDIデバイス選択イベント
		eventBus.on(EVENT_MIDI_DEVICE_SELECTED, (data) => {
			if (this.midiManager) {
				this.midiManager.selectDevice(data.deviceId);
			}
		});

		// 視覚的フィードバック無効化イベント
		eventBus.on(EVENT_VISUAL_FEEDBACK_DISABLED, () => {
			this.activeKeys.clear();
			this.activeKeys = new Set(this.activeKeys);
		});

		// 鍵盤表示モード変更イベント
		eventBus.on(EVENT_KEYBOARD_DISPLAY_MODE_CHANGED, () => {
			// モード変更時はactiveKeysとsustainedKeysをクリア
			this.activeKeys.clear();
			this.activeKeys = new Set(this.activeKeys);
			this.sustainedKeys.clear();
		});
	}

	/**
	 * MIDI破棄
	 */
	dispose() {
		if (this.midiManager) {
			this.midiManager.dispose();
			this.midiManager = null;
		}

		this.isSustainPedalDown = false;
		this.sustainedKeys.clear();
		this.activeKeys.clear();
		this.activeKeys = new Set(this.activeKeys);
		this.sustainPedalDown = false;
		this.midiEnabled = false;
	}

	/**
	 * MIDIマネージャーを取得
	 */
	getMIDIManager(): MIDIManager | null {
		return this.midiManager;
	}
}

// シングルトンインスタンスをエクスポート
export const midiStore = new MIDIStore();
