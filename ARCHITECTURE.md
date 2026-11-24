# Architecture

How Web Media Manager is put together, and where a change belongs. Read
`AGENTS.md` first for commands and conventions; this file is the map.

## Runtime shape

A single-page React application with no backend. Everything — library index,
artwork, playlists, job state, installed themes and visualizers, offline audio
— lives in the browser (IndexedDB via Dexie, plus `localStorage` for small
preferences). Long-running work runs in a web worker pool. The app is
installable as an offline PWA.

The code is deliberately split so the domain layer can later run on a server:

```text
components / pages / providers        React, browser-only
        │  calls commands, reads hooks
        ▼
src/core                              transport-neutral domain API
        │  depends only on ports + contracts
        ▼
src/core/ports  ◄── registered at boot ──  src/lib/persistence/browser/*
        │
        ▼
src/lib                               implementations: Dexie, taglib, sources,
                                      sync, themes pipeline, workers
```

The rule that keeps this honest: **`src/core` may not import `src/lib`
implementations, browser globals, or RxJS.** It reaches the platform only
through the port getters in `src/core/ports`.

## Layers

### `src/core` — public domain API

One folder per Open Subsonic domain, each with an `index.ts` barrel, re-exported
as a namespace from `src/core/index.ts`:

| Namespace     | Responsibility                                                                      |
| ------------- | ----------------------------------------------------------------------------------- |
| `system`      | ping, scan status, store init, `WMM_VERSION` / `WMM_BUILD_TIME` / `WMM_COMMIT_HASH` |
| `browsing`    | album lists, album songs, music folders, genres, song lookup                        |
| `searching`   | local search plus online lookup (MusicBrainz / iTunes)                              |
| `scanning`    | folder add, library scan, clear library, playlist import                            |
| `media`       | cover art and per-song artwork retrieval                                            |
| `metadata`    | tag read/write, rename, bulk tag reads                                              |
| `playlists`   | play queue, favorites, playlist read/write                                          |
| `jobs`        | job contract, progress aggregation, `IJobRunner` port                               |
| `themes`      | install/apply/uninstall, trial, crash guard, widget kit                             |
| `visualizers` | plugin manager, manifest validation, analyser frame source                          |
| `ui`          | now-playing UI state commands                                                       |
| `events`      | re-export of `src/events` (taxonomy + bus)                                          |

`src/core/contracts/` holds the ID3-aligned JSON view types (`Child`,
`AlbumID3`, `MusicFolder`), the `MusicSource` union, and the mappers that turn
tag data into a `Song`. `src/core/ports/` holds the portable interfaces.

### `src/core/ports` — the platform seam

Each port is a module-level provider slot with a getter and a setter:

```ts
setStoreProvider(provider); // getStore()      catalog: songs, albums, playlists
setSourcesProvider(provider); // getSourcesStore()
setMetadataReaderProvider(); // getMetadataReader()
setPlaylistStoreProvider(); // getPlaylistStore()
setPlaylistWriteProvider(); // getPlaylistWriteAdapter()
setPlayHistoryStoreProvider();
setVisualizerPluginStoreProvider();
setThemeStoreProvider();
setLyricsSettingsStoreProvider();
```

`src/lib/persistence/browser/*` supplies the browser bindings. They are
registered once at module scope in `src/App.tsx`, before any provider or
component can call into core. A future Tauri or Hono server binding registers
its own implementations and the core is unchanged.

### `src/lib` — implementations

| Folder                         | Contents                                                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `persistence/`                 | `IRepository`, `MemoryStore`, `QueryOptions` sorting/selectors, `dexie/` (one class per table), `file/` (File System Access), `browser/` (port bindings, `CombinedMetadataStore`) |
| `metadata/`                    | `reader/` (taglib-wasm reader, `importSongs`), `writer/` (write strategies, ID3v2.3 conversion), `artwork/` (extract, resize, thumbnails)                                         |
| `metadata-providers/`          | online enrichment upstreams (MusicBrainz, iTunes) — pure `fetch`, server-reusable                                                                                                 |
| `sources/`                     | one `IMusicSourceStrategy` per source kind, plus `resync`, `config`, `source-ui.tsx`                                                                                              |
| `sync/`                        | device detectors, `SyncService`, per-device writers, USB/MTP transports                                                                                                           |
| `themes/`                      | `componentModel/`, `parser/`, `validator/`, `issues/`, `ir/`, `pipeline/`, `render/`, `runtime/`, `testing/`                                                                      |
| `visualizers/`                 | `ShaderHost` (WebGL), `CanvasHost` (ES module from a Blob URL), palette store, seeding                                                                                            |
| `background-jobs/`             | `BackgroundService`, `BrowserJobRunner`, cancellation, job persistence, resume                                                                                                    |
| `keyboard-shortcuts/`          | registry, `handleKey`, default bindings, platform modifier detection                                                                                                              |
| `offline/`                     | IndexedDB audio cache and the download job                                                                                                                                        |
| `secrets/`                     | `createEncryptedSecretStore` (AES-GCM, IndexedDB master key + localStorage envelope)                                                                                              |
| `lyrics/`, `lyrics-providers/` | LRC model, LRCLIB provider, result ranking                                                                                                                                        |
| `waveform/`                    | peak extraction for the timed-lyrics editor                                                                                                                                       |
| `tv/`                          | TV detection, spatial navigation, ordering                                                                                                                                        |
| `ui/`                          | now-playing UI store                                                                                                                                                              |

### `src/events` — commands and events

One RxJS `Subject` carrying a discriminated `WmmMessage` (`kind: "command" |
"event"`). The taxonomy in `src/events/taxonomy.ts` is the closed registry of
names (`wmm.<domain>.<action>`) with per-name payload types; `invoke()` and
`publish()` reject unknown names. That registry is the security boundary for
user-configurable gestures — a theme or shortcut can only reference a name that
exists. `docs/events-taxonomy.md` is the contract; renaming a name is breaking.

`connectCommandDispatch()` (called once in `App.tsx`) links `bus.invoke()` to
handlers registered by providers and UI. `src/events/job-notifications.ts` and
`playlist-import-events.ts` are side-effect modules imported for their
subscriptions.

Keyboard shortcuts are a separate, small registry
(`src/lib/keyboard-shortcuts/`): `registerDefaultShortcuts()` binds ids to
combos and actions, `handleKey` is the single `keydown` listener, and
`usesCommandMeta` maps `ctrl: true` to Cmd on macOS. Shortcut actions either
push onto `keyShortcut$` or invoke a bus command.

### `src/providers` — React state

`SongProvider` (library queries), `PlaybackProvider` (Web Audio engine, queue,
~990 lines), `SyncProvider` (devices and sync queue), `VisualizerProvider`
(plugin cache and active plugin). They wrap the app below `ThemeProvider` and
above the routes, because the header reads playback state.

### `src/components` and `src/pages`

Feature components are one folder per concept with a barrel. `ui/` holds the
shadcn primitives (`base-nova` style over `@base-ui/react`, lucide icons,
`class-variance-authority`). `theme-widgets/` holds the widgets a theme layout
can render; `registerAppThemeWidgets()` registers them with the renderer and
returns a disposer that `App.tsx` hooks to `import.meta.hot.dispose`.

Routes: `/` (songs, or the TV tile grid), `/songs`, `/albums`, `/artists`,
`/playlists` (each with an optional `:mode`), `/sync`, `/settings`, plus the
`/tv/*` detail routes. `MainLayout` is the built-in shell; when a theme with
layouts is active, `builtinUi` goes false and `ThemedShellRoute` renders the
theme instead, while `/settings` always keeps host chrome.

## Persistence

`WmmMusicDb` (Dexie, database `wmm.music`) declares one table per repository:
`sources`, `songs`, `songArtwork`, `playlists`, `jobs`, `playHistory`,
`plugins`, `pluginFiles`, `pluginSettings`, `offlineAudio`, `hiddenTracks`,
`themes`, `themeFiles`, `themeSettings`, `appSettings`.

The schema is **version 1 and edited in place** — the app is unreleased, so
there are no upgrade steps; delete the database to pick up a schema change.
Start versioning once it ships.

`IRepository` + `QueryOptions` give every store the same query surface
(sorting, selectors, `compareDiscThenTrack`). `MemoryStore` is the in-memory
implementation used by tests. `CombinedMetadataStore` fans a query across
sources and merges by source priority.

Small preferences (volume, active visualizer, language, hidden-song flags,
seeded-example flags) live in `localStorage` behind `src/lib/safeStorage.ts`.
Credentials never do: `lib/secrets/encryptedSecretStore.ts` gives each source
kind its own namespace, and secrets are deleted with the source and on Clear DB.

## Music sources

One class per source kind implementing `IMusicSourceStrategy`: `add`, `sync`,
`removeSource`, `updateSource?`, `collectSongs`, `resolvePictureBytes`,
`getSecret?`, plus declarative `configFields`, `requiresConfig`, `isAvailable`
and capability flags. Two registries in `src/lib/sources/index.ts`:

- `musicSourceStrategies` — user-addable kinds (local folder, Subsonic).
- `allMusicSourceStrategies` — every kind including sync devices, used for
  dispatch by `kind` (playback, resync, source filter).

Strategies are `.ts`, UI-free and worker-safe; per-kind icons and badges live
in `source-ui.tsx`. Config and credentials are resolved on the main thread and
threaded into job payloads, because workers cannot read IndexedDB secrets.

The bulk import does real set logic: upsert collected songs, delete library
songs for that `sourceId` that were no longer collected, then save — in that
order. Startup resync (`resyncAllSources`) is silent; user-initiated work is
loud.

## Background jobs and workers

`WorkerPool` owns `metadata.worker.ts` instances; `BrowserWorkerAdapter`
rejects a job on `worker.onerror` instead of hanging. Job bodies live in
`src/workers/shared/` (`runBulkImport`, `runBulkEdit`, `runArtworkProcess`,
`runDeviceSync`, `runDeviceRemove`, `runSourceRemove`, `runOfflineDownload`).
`BackgroundService` tracks lifecycle, publishes progress to the bus, and
persists state so `resumeInterruptedJobs()` can restore what a previous session
left unfinished.

## Themes

Pipeline: ZIP package → manifest + `theme.xml` + per-form-factor layouts →
validation → compile to Theme IR → store in Dexie → render.

- `src/lib/themes/parser` (saxes, no DOCTYPE/PI), `validator` (stage codes),
  `ir` (compile + palette derivation), `pipeline` (package checks).
- `src/lib/themes/render` — layout renderer, stylesheet builder, asset cache,
  form-factor resolution, `browser/` React host.
- `src/lib/themes/runtime` — token runtime and the first-paint mirror that
  avoids a flash of the default UI.
- `src/core/themes` is the public API only: `ThemeManager`, `ActiveTheme`,
  trial, crash guard, navigation handler, attribute helpers, `getWidgetMinSize`.
  Lower-level types stay in `src/lib/themes`.
- Widget definitions import `defineWidget` from `@/core/themes/widgetKit` — a
  cycle-safe leaf that never re-exports the theme API barrel.

Safety: no CSS/JS/HTML from authors, SVG sanitized, 15-second keep-or-revert
trial bar, `?theme=default` safe mode, Settings always host chrome. The spec
lives in `docs/themes/`.

## Visualizers

`src/core/visualizers` holds the framework-free `PluginManager` (install,
validate, list, remove, load, settings), manifest validation, the fflate ZIP
reader with path/size limits, and `AnalyserFrameSource`. Storage goes through
the `VisualizerPluginStore` port. Runtime hosts live in `src/lib/visualizers`:
`ShaderHost` (WebGL uniforms `uTime`, `uResolution`, `uBass`, `uMid`,
`uTreble`, `uVolume`, `uFFT[256]`, `uWaveform[256]`) and `CanvasHost` (ES module
from a Blob URL, TypeScript stripped with a lazily imported sucrase).
`createRuntimeHost` is the only runtime switch. Plugin management and settings
live on `/settings`; the now-playing panel only renders the active plugin.

## i18n

`src/i18n/resources.ts` is the registry of every user-facing key, with a
description per key; `en-US.ts` is the typed default pack. Every other language
is a two-column CSV in `src/i18n/locales/` (`key,<lang>`), discovered by
`import.meta.glob` and bundled with `?raw`. `npm run i18n:sync` regenerates the
CSVs from the registry, and `locales/csv.test.ts` fails when one is out of
sync. `docs/resources-i18n.md` is the contract.

## Build, PWA and deploy

`vite.config.ts` injects the version, build timestamp and 7-character commit
hash as defines, sets the base path per mode, and configures the PWA
(`registerType: "prompt"`, precached shell, network-first runtime cache for
`/subsonic` and `/art/`). The service worker is disabled in dev.

`.github/workflows/deploy.yml` runs on pushes to `master` that touch `src/`,
`public/`, `package.json`, `package-lock.json`, `vite.config.ts` or
`index.html`: install, `npm run build:github`, then `npm run deploy`
(`gh-pages`).

## Where a change belongs

| Change                                | Location                                                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| New library query or domain operation | `src/core/<domain>/`, exposed through its barrel                                                                                  |
| New storage table                     | `src/lib/persistence/dexie/WmmMusicDb.ts` + a `Dexie*Store` class + a port in `src/core/ports`                                    |
| New user-triggerable action           | name it in `src/events/taxonomy.ts`, handle it in a provider, bind it in `registerDefaultShortcuts` if it needs a key             |
| New source kind                       | a class in `src/lib/sources/`, registered in both strategy lists, UI in `source-ui.tsx`                                           |
| New long-running operation            | a `run*` body in `src/workers/shared/`, dispatched through the pool                                                               |
| New screen                            | `src/pages/`, a route in `App.tsx`, a path in `NAVIGATE_PATHS`                                                                    |
| New theme widget                      | `src/components/theme-widgets/<area>/<Name>/` with a `definition.ts` using `defineWidget`, registered in `theme-widgets/index.ts` |
| New user-facing string                | `src/i18n/resources.ts` + `en-US.ts`, then `npm run i18n:sync`                                                                    |
| New UI primitive                      | `src/components/ui/`, shadcn `base-nova` conventions                                                                              |
| Placeholder for missing artwork       | `NoArtworkDisc` in `src/components/ui/no-artwork-disc.tsx` — a disc in `text-accent` on `bg-accent/15`                            |

## Layering

`src/index.css` defines the z-index scale as `@theme` tokens, which Tailwind
maps to `z-*` utilities. Every app-level z-index comes from this list:

| Utility        | Value | Role                                          |
| -------------- | ----- | --------------------------------------------- |
| `z-sticky`     | 10    | sticky headers inside a scroll container      |
| `z-raised`     | 20    | in-panel overlays, sheet backdrops            |
| `z-sheet`      | 30    | non-modal sheets (album detail)               |
| `z-chrome-row` | 40    | in-flow player controls and bottom nav        |
| `z-overlay`    | 100   | now playing, album fullscreen, themed overlay |
| `z-chrome`     | 110   | floating player bar, host settings button     |
| `z-modal`      | 200   | dialogs and drawers, with their backdrops     |
| `z-popover`    | 300   | popover, menu, select, tooltip                |
| `z-toast`      | 400   | toasts                                        |

Pick the layer by role, not by what a surface must beat. The album detail sheet
is `modal={false}` and offsets itself above the player bar with
`bottom-(--sheet-offset,9.5rem)`, so it deliberately sits below `z-chrome-row`
and `z-chrome`; raising it to the modal layer puts it over the nav and player
bar. In-component stacking (coverflow depth, slider thumbs, gradient overlays)
stays local and does not use these tokens.
