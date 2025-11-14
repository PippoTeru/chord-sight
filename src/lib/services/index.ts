/**
 * Services Barrel Export
 *
 * Public API for application services.
 */

// Event Bus Service
export {
	eventBus,
	EVENT_MIDI_DEVICE_SELECTED,
	EVENT_VISUAL_FEEDBACK_DISABLED,
	EVENT_KEYBOARD_DISPLAY_MODE_CHANGED,
	EVENT_SETTINGS_STORAGE_ERROR,
	type MidiDeviceSelectedEvent,
	type SettingsStorageErrorEvent,
	type EventPayloadMap,
	type EventName
} from './eventBus';

// MIDI Service (already has its own barrel export at ./midi/index.ts)
export { MIDIManager, type MIDIManagerConfig } from './midi';
