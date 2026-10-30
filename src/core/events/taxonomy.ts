/**
 * WMM event & command taxonomy (Step 1).
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
/** Commands: things a user can trigger from a gesture (button/shortcut/binding). */
export type WmmCommandName =
  // playback
  | "wmm.playback.playpause"
  | "wmm.playback.next"
  | "wmm.playback.prev"
  | "wmm.playback.seek"
  | "wmm.playback.stop"
  | "wmm.playback.setVolume"
  | "wmm.playback.toggleShuffle"
  | "wmm.playback.toggleRepeat"
  | "wmm.playback.playSong"
  | "wmm.playback.playQueue"
  | "wmm.playback.clearQueue"
  // library / browsing
  | "wmm.library.song.edit"
  | "wmm.library.song.quickEdit"
  | "wmm.library.song.open"
  | "wmm.library.queue"
  | "wmm.browsing.showAlbums"
  | "wmm.browsing.showArtists"
  | "wmm.browsing.showGenres"
  // scanning
  | "wmm.scanning.rescan"
  | "wmm.scanning.addSource"
  | "wmm.scanning.clearLibrary"
  // searching
  | "wmm.searching.search"
  // playlists
  | "wmm.playlists.save"
  // sync
  | "wmm.sync.start"
  // ui
  | "wmm.ui.openSettings"
  | "wmm.ui.openShortcuts"
  | "wmm.ui.close";

/** Payloads for each command (empty object when none). */
export interface WmmCommandPayload {
  "wmm.playback.playpause": undefined;
  "wmm.playback.next": undefined;
  "wmm.playback.prev": undefined;
  "wmm.playback.seek": { positionSeconds: number };
  "wmm.playback.stop": undefined;
  "wmm.playback.setVolume": { volume: number };
  "wmm.playback.toggleShuffle": undefined;
  "wmm.playback.toggleRepeat": undefined;
  "wmm.playback.playSong": { songId: string };
  "wmm.playback.playQueue": undefined;
  "wmm.playback.clearQueue": undefined;
  "wmm.library.song.edit": { songId: string };
  "wmm.library.song.quickEdit": { songIds: string[] };
  "wmm.library.song.open": { songId: string };
  "wmm.library.queue": { songIds: string[] };
  "wmm.browsing.showAlbums": undefined;
  "wmm.browsing.showArtists": undefined;
  "wmm.browsing.showGenres": undefined;
  "wmm.scanning.rescan": undefined;
  "wmm.scanning.addSource": undefined;
  "wmm.scanning.clearLibrary": undefined;
  "wmm.searching.search": { query: string };
  "wmm.playlists.save": undefined;
  "wmm.sync.start": undefined;
  "wmm.ui.openSettings": undefined;
  "wmm.ui.openShortcuts": undefined;
  "wmm.ui.close": undefined;
}

// ---------------------------------------------------------------- events
/** Events: things the app emits to report state changes. */
export type WmmEventName =
  // playback state
  | "wmm.playback.started"
  | "wmm.playback.paused"
  | "wmm.playback.completed"
  | "wmm.playback.queueChanged"
  | "wmm.playback.shuffleChanged"
  | "wmm.playback.repeatChanged"
  | "wmm.playback.volumeChanged"
  | "wmm.playback.positionChanged"
  // library
  | "wmm.library.song.added"
  | "wmm.library.song.updated"
  | "wmm.library.song.deleted"
  | "wmm.library.source.added"
  | "wmm.library.source.deleted"
  // scanning
  | "wmm.scanning.started"
  | "wmm.scanning.progress"
  | "wmm.scanning.completed"
  // jobs
  | "wmm.jobs.enqueued"
  | "wmm.jobs.progress"
  | "wmm.jobs.completed"
  // searching
  | "wmm.searching.completed"
  // ui
  | "wmm.ui.viewChanged"
  | "wmm.ui.editorModeChanged";

/** Payloads for each event. */
export interface WmmEventPayload {
  "wmm.playback.started": { songId: string; positionSeconds?: number };
  "wmm.playback.paused": { songId: string };
  "wmm.playback.completed": { songId: string };
  "wmm.playback.queueChanged": { songIds: string[] };
  "wmm.playback.shuffleChanged": { enabled: boolean };
  "wmm.playback.repeatChanged": { state: "off" | "all" | "one" };
  "wmm.playback.volumeChanged": { volume: number };
  "wmm.playback.positionChanged": { songId: string; positionSeconds: number };
  "wmm.library.song.added": { songId: string };
  "wmm.library.song.updated": { songId: string };
  "wmm.library.song.deleted": { songId: string };
  "wmm.library.source.added": { sourceId: string };
  "wmm.library.source.deleted": { sourceId: string };
  "wmm.scanning.started": undefined;
  "wmm.scanning.progress": { processed: number; total: number };
  "wmm.scanning.completed": { processed: number };
  "wmm.jobs.enqueued": { jobId: string; type: string };
  "wmm.jobs.progress": { jobId: string; processed: number; total: number };
  "wmm.jobs.completed": { jobId: string };
  "wmm.searching.completed": { query: string };
  "wmm.ui.viewChanged": { view: string };
  "wmm.ui.editorModeChanged": { mode: "song" | "edit" };
}

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

/** All known command/event names that a UI config may bind to. */
export const WMM_COMMAND_NAMES: readonly WmmCommandName[] = [
  "wmm.playback.playpause",
  "wmm.playback.next",
  "wmm.playback.prev",
  "wmm.playback.seek",
  "wmm.playback.stop",
  "wmm.playback.setVolume",
  "wmm.playback.toggleShuffle",
  "wmm.playback.toggleRepeat",
  "wmm.playback.playSong",
  "wmm.playback.playQueue",
  "wmm.playback.clearQueue",
  "wmm.library.song.edit",
  "wmm.library.song.quickEdit",
  "wmm.library.song.open",
  "wmm.library.queue",
  "wmm.browsing.showAlbums",
  "wmm.browsing.showArtists",
  "wmm.browsing.showGenres",
  "wmm.scanning.rescan",
  "wmm.scanning.addSource",
  "wmm.scanning.clearLibrary",
  "wmm.searching.search",
  "wmm.playlists.save",
  "wmm.sync.start",
  "wmm.ui.openSettings",
  "wmm.ui.openShortcuts",
  "wmm.ui.close",
];

export const WMM_EVENT_NAMES: readonly WmmEventName[] = [
  "wmm.playback.started",
  "wmm.playback.paused",
  "wmm.playback.completed",
  "wmm.playback.queueChanged",
  "wmm.playback.shuffleChanged",
  "wmm.playback.repeatChanged",
  "wmm.playback.volumeChanged",
  "wmm.playback.positionChanged",
  "wmm.library.song.added",
  "wmm.library.song.updated",
  "wmm.library.song.deleted",
  "wmm.library.source.added",
  "wmm.library.source.deleted",
  "wmm.scanning.started",
  "wmm.scanning.progress",
  "wmm.scanning.completed",
  "wmm.jobs.enqueued",
  "wmm.jobs.progress",
  "wmm.jobs.completed",
  "wmm.searching.completed",
  "wmm.ui.viewChanged",
  "wmm.ui.editorModeChanged",
];

/** Type guard: is a name a known command? (used for config/gesture validation) */
export function isWmmCommand(name: string): name is WmmCommandName {
  return (WMM_COMMAND_NAMES as readonly string[]).includes(name);
}

/** Type guard: is a name a known event? */
export function isWmmEvent(name: string): name is WmmEventName {
  return (WMM_EVENT_NAMES as readonly string[]).includes(name);
}
