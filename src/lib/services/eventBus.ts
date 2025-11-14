/**
 * Event Bus Utility
 *
 * モジュール間の疎結合な通信を実現するイベントバスパターン
 * 循環依存を回避し、テスタビリティを向上させる
 */

// イベント名の定数（タイポ防止）
export const EVENT_MIDI_DEVICE_SELECTED = 'midi:device:selected' as const;
export const EVENT_VISUAL_FEEDBACK_DISABLED = 'settings:visual:feedback:disabled' as const;
export const EVENT_KEYBOARD_DISPLAY_MODE_CHANGED = 'settings:keyboard:display:mode:changed' as const;
export const EVENT_SETTINGS_STORAGE_ERROR = 'settings:storage:error' as const;

// イベントデータの型定義
export interface MidiDeviceSelectedEvent {
	deviceId: string | null;
}

export interface SettingsStorageErrorEvent {
	operation: 'save' | 'load';
	error: Error;
}

// イベントペイロードマッピング（型安全性のため）
export interface EventPayloadMap {
	[EVENT_MIDI_DEVICE_SELECTED]: MidiDeviceSelectedEvent;
	[EVENT_VISUAL_FEEDBACK_DISABLED]: void;
	[EVENT_KEYBOARD_DISPLAY_MODE_CHANGED]: void;
	[EVENT_SETTINGS_STORAGE_ERROR]: SettingsStorageErrorEvent;
}

// イベント名の型
export type EventName = keyof EventPayloadMap;

type EventCallback<T = any> = (data: T) => void;

class EventBus {
	private listeners: Map<string, Set<EventCallback>> = new Map();

	/**
	 * イベントリスナーを登録（型安全）
	 */
	on<K extends EventName>(event: K, callback: EventCallback<EventPayloadMap[K]>): () => void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}

		this.listeners.get(event)!.add(callback);

		// アンサブスクライブ関数を返す
		return () => {
			this.off(event, callback);
		};
	}

	/**
	 * イベントリスナーを解除（型安全）
	 */
	off<K extends EventName>(event: K, callback: EventCallback<EventPayloadMap[K]>): void {
		const callbacks = this.listeners.get(event);
		if (callbacks) {
			callbacks.delete(callback);
			if (callbacks.size === 0) {
				this.listeners.delete(event);
			}
		}
	}

	/**
	 * イベントを発火（型安全）
	 */
	emit<K extends EventName>(
		event: K,
		...args: EventPayloadMap[K] extends void ? [] : [EventPayloadMap[K]]
	): void {
		const callbacks = this.listeners.get(event);
		if (callbacks) {
			callbacks.forEach((callback) => {
				try {
					callback(args[0]);
				} catch (error) {
					console.error(`Error in event listener for "${event}":`, error);
				}
			});
		}
	}

	/**
	 * 全てのリスナーをクリア（主にテスト用）
	 */
	clear(): void {
		this.listeners.clear();
	}
}

// シングルトンインスタンス
export const eventBus = new EventBus();
