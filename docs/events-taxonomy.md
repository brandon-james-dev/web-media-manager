# WMM Event & Command Taxonomy (Step 1)

Stable, user-addressable contract for app interaction. Commands are what a
user triggers (buttons, shortcuts, and other configurable gestures); events
are what the app reports happened. This file is the design record / contract
doc.

## Naming scheme

    wmm.<domain>.<action>

Domains align with the Open Subsonic domains used across `core/`:
system, browsing, searching, scanning, library, metadata, media,
playlists, playback, jobs, sync, ui.

## Command vs event

| | Command | Event |
|---|---|---|
| Kind | `wmm.playback.togglePause` | `wmm.playback.paused` |
| Meaning | "do this" (user intent) | "this happened" (state change) |
| Issued by | User gesture / config binding | The app (core/providers) |
| Consumed by | App logic | UI reactive views |
| Gesture-addressable | Yes — a button click fires a command | No — UI binds to react to these |

This distinction matters for configurable interactions: a user gesture
*issues* commands; it must never emit "events" (which would fake state the
app doesn't hold).

## The registry is the security boundary

User-provided configuration references command names; the parse layer maps
them only through this registry. Unknown names are rejected. The registry is
the closed set of everything a user can trigger — it cannot invoke arbitrary
code. This is what makes user-defined interactions safe.

## Stability contract

These names are USER-FACING configuration identifiers. Renaming one is a
breaking change for any user layout/shortcut that references it. Treat the
taxonomy as a stable public API:
- add new names freely (non-breaking)
- rename/remove only with explicit migration/versioning

## Alignment with current behavior

The command list derives from today's actual interaction surface:
- Playback: PlaybackProvider (`playPause`, `seek`, `prevTrack`, `nextTrack`,
  stop, shuffle, repeat, volume)
- Shortcuts (`registerDefaultShortcuts`): playpause, next, prev, queue,
  edit, close, openShortcuts — mapped onto the same vocabulary here
- Core domains (system/browsing/searching/scanning/media/metadata/playlists/
  jobs): getAlbumList, search, addFolder, clearLibrary, updateTags,
  savePlayQueue, getJobService... — the commands trigger these where relevant
- Library/sync: song edit/quickEdit/open, source add, sync start

## Types

`src/core/events/taxonomy.ts` holds:
- `WmmCommandName` / `WmmEventName` — the name unions (closed)
- `WmmCommandPayload` / `WmmEventPayload` — typed payload per name
- `WmmCommand` / `WmmEvent` / `WmmMessage` — envelope
- `WMM_COMMAND_NAMES` / `WMM_EVENT_NAMES` — runtime lists
- `isWmmCommand()` / `isWmmEvent()` — guards used by config validation

## Next steps (when ready)

1. `WmmBus`: a single typed bus in `core/events` carrying `WmmMessage`
   (command invocation + event subscription), wrapping today's scattered
   `events/*.ts` subjects.
2. Command dispatch: `invoke(name, payload)` → routes to the core/domain
   function or provider action.
3. Configurable UI bindings follow the command/event contract above.
