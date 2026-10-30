/**
 * WMM event & command taxonomy.
 *
 * The stable, user-addressable contract for app interaction. Command names
 * are what a user triggers via gestures (buttons, shortcuts, configurable
 * bindings); the app EMITS EVENT names. Both share the `wmm.<domain>.<action>`
 * naming scheme, aligned with the Open Subsonic domains used across `core/`.
 *
 *  - Commands are things a user can trigger ("toggle pause", "edit song").
 *  - Events are things the app reports happened ("playback paused").
 *
 * These names are USER-FACING configuration identifiers: keyboard
 * shortcuts, gesture bindings, and (later) scripts reference them. Treat
 * them as a stable contract — renaming requires updating every user config.
 *
 * Security note: this registry is also the SAFETY BOUNDARY for user-supplied
 * configuration. A gesture binding is only valid if its name exists here;
 * unknown names are rejected. No name can invoke arbitrary code.
 *
 * MAINTENANCE: each entry is defined ONCE as a key of a const record, with
 * its payload as the value. The name union, payload type, and runtime name
 * list are all DERIVED from that single record, so adding/renaming an event
 * is exactly one edit — there is no parallel list to keep in sync.
 */

// ---------------------------------------------------------------- domains
/** Top-level event/command domains, aligned to Open Subsonic + app areas. */
export type WmmDomain =
  | "system"
  | "browsing"
  | "searching"
  | "scanning"
  | "library"
  | "metadata"
  | "media"
  | "playlists"
  | "playback"
  | "jobs"
  | "sync"
  | "ui";

// ---------------------------------------------------------------- commands
/**
 * Commands: things a user can trigger from a gesture (button/shortcut/binding).
 * Single source of truth — the key is the name, the value is its payload type
 * (`undefined` when the command carries no payload).
 */
export const WMM_COMMANDS = {
  // playback
  "wmm.playback.playpause": undefined,
  "wmm.playback.next": undefined,
  "wmm.playback.prev": undefined,
  "wmm.playback.seek": { positionSeconds: 0 } as { positionSeconds: number },
  "wmm.playback.stop": undefined,
  "wmm.playback.setVolume": { volume: 0 } as { volume: number },
  "wmm.playback.toggleShuffle": undefined,
  "wmm.playback.toggleRepeat": undefined,
  "wmm.playback.playSong": {} as { songId: string },
  "wmm.playback.playQueue": {} as { songIds: string[] },
  "wmm.playback.clearQueue": undefined,
  "wmm.playback.removeFromQueue": {} as { songId: string },
  // library / browsing
  "wmm.library.song.edit": {} as { songId: string },
  "wmm.library.song.quickEdit": {} as { songIds: string[] },
  "wmm.library.song.open": {} as { songId: string },
  "wmm.library.queue": {} as { songIds: string[] },
  "wmm.browsing.showAlbums": undefined,
  "wmm.browsing.showArtists": undefined,
  "wmm.browsing.showGenres": undefined,
  // scanning
  "wmm.scanning.rescan": undefined,
  "wmm.scanning.addSource": undefined,
  "wmm.scanning.clearLibrary": undefined,
  // searching
  "wmm.searching.search": {} as { query: string },
  // playlists
  "wmm.playlists.save": undefined,
  "wmm.playlists.addSong": {} as { songId: string },
  // sync
  "wmm.sync.start": undefined,
  "wmm.sync.addDevice": undefined,
  "wmm.sync.refreshDevices": undefined,
  "wmm.sync.sync": {} as { deviceId: string },
  "wmm.sync.clearQueue": undefined,
  "wmm.sync.removeTracks": {} as { deviceId: string; trackIds: number[] },
  "wmm.sync.queueSongs": {} as { songIds: string[] },
  "wmm.sync.dequeueSongs": {} as { songIds: string[] },
  // ui
  "wmm.ui.openSettings": undefined,
  "wmm.ui.openShortcuts": undefined,
  "wmm.ui.close": undefined,
} as const;

/** Command names (derived). */
export type WmmCommandName = keyof typeof WMM_COMMANDS;

/** Payload for a command (derived; `undefined` when the command carries none). */
export type WmmCommandPayload = {
  [N in WmmCommandName]: (typeof WMM_COMMANDS)[N];
};

// ---------------------------------------------------------------- events
/**
 * Events: things the app emits to report state changes.
 * Single source of truth — key is the name, value is its payload type.
 */
export const WMM_EVENTS = {
  // playback state
  "wmm.playback.started": {} as { songId: string; positionSeconds?: number },
  "wmm.playback.paused": {} as { songId: string },
  "wmm.playback.completed": {} as { songId: string },
  "wmm.playback.queueChanged": {} as { songIds: string[] },
  "wmm.playback.shuffleChanged": {} as { enabled: boolean },
  "wmm.playback.repeatChanged": {} as { state: "off" | "all" | "one" },
  "wmm.playback.volumeChanged": {} as { volume: number },
  "wmm.playback.positionChanged": {
    songId: "",
    positionSeconds: 0,
  } as { songId: string; positionSeconds: number },
  // library
  "wmm.library.song.added": {} as { songId: string },
  "wmm.library.song.updated": {} as { songId: string },
  "wmm.library.song.deleted": {} as { songId: string },
  "wmm.library.source.added": {} as { sourceId: string },
  "wmm.library.source.deleted": {} as { sourceId: string },
  // scanning
  "wmm.scanning.started": undefined,
  "wmm.scanning.progress": {} as { processed: number; total: number },
  "wmm.scanning.completed": {} as { processed: number },
  // jobs — single discriminated lifecycle event. `state` includes
  // started/progress/completed/error/canceled, and `custom:*` job events.
  "wmm.jobs.state": {} as {
    state: string;
    jobId: string;
    jobType?: string;
    parentJobId?: string;
    payload?: unknown;
  },
  // searching
  "wmm.searching.completed": {} as { query: string },
  // playlists
  "wmm.playlists.songAdded": {} as { songId: string, playlistName?: string },
  // sync
  "wmm.sync.queued": {} as { songIds: string[] },
  "wmm.sync.dequeued": {} as { songIds: string[] },
  "wmm.sync.deviceAdded": {} as { deviceId: string },
  "wmm.sync.syncCompleted": {} as { deviceId: string },
  // ui
  "wmm.ui.selectionChanged": {} as { songIds: string[] },
  "wmm.ui.viewChanged": {} as { view: string },
  "wmm.ui.editorModeChanged": {} as { mode: "song" | "edit" },
} as const;

/** Event names (derived). */
export type WmmEventName = keyof typeof WMM_EVENTS;

/** Payload for an event (derived; `undefined` when the event carries none). */
export type WmmEventPayload = {
  [N in WmmEventName]: (typeof WMM_EVENTS)[N];
};

// ------------------------------------------------------------- envelope
/** A command issued from a user gesture / config binding. */
export interface WmmCommand<C extends WmmCommandName = WmmCommandName> {
  kind: "command";
  name: C;
  payload?: WmmCommandPayload[C];
}

/** An event emitted by the app. */
export interface WmmEvent<E extends WmmEventName = WmmEventName> {
  kind: "event";
  name: E;
  payload?: WmmEventPayload[E];
}

/** The unified message carried on the WmmBus. */
export type WmmMessage = WmmCommand | WmmEvent;

/** All known command/event names that a UI config may bind to (derived). */
export const WMM_COMMAND_NAMES = Object.keys(WMM_COMMANDS) as WmmCommandName[];
export const WMM_EVENT_NAMES = Object.keys(WMM_EVENTS) as WmmEventName[];

/** Type guard: is a name a known command? (used for config/gesture validation) */
export function isWmmCommand(name: string): name is WmmCommandName {
  return (WMM_COMMAND_NAMES as readonly string[]).includes(name);
}

/** Type guard: is a name a known event? */
export function isWmmEvent(name: string): name is WmmEventName {
  return (WMM_EVENT_NAMES as readonly string[]).includes(name);
}
