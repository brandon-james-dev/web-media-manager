# Web Media Manager

A modern web-based media management application focused on local media libraries, portable device synchronization, metadata management, and high-performance playback.

## Live Demo

The application is deployed on GitHub Pages:

https://brandon-james-dev.github.io/web-media-manager/

Open it directly in your browser — no installation required.

## Features

### Library Management

- Scan and import local media libraries
- Organize music, albums, artists, genres, and playlists
- Edit metadata and artwork
- Fast client-side searching and filtering
- Multi-column sorting and grouping
- Shared search panel across playlists and the sync queue, grouping matches by genre, artist, album, then song

### Music Sources

- Local folder sources (File System Access API)
- Subsonic-compatible servers, with credentials held in the secrets store
- Sync devices exposed as browsable sources
- Per-source capability flags (streaming, browsing, searching, metadata write, library scanning, offline, playlist write, sync write)
- Background resync that keeps a source's library current without blocking the UI

### Playlist Management

- Create and manage playlists
- Import playlists from supported devices
- Smart playlist support
- Playlist editing and track reordering
- Drag and drop between the library and the sidebar

### Device Support

- Classic iPod synchronization
- Zune synchronization over MTPZ
- Generic MTP / mass-storage devices
- iTunesDB parsing and generation
- Artwork database support
- Device library inspection, grouped by songs, albums, artists, genres, and playlists
- Playlist and metadata synchronization
- Per-track and multi-select removal from a device, behind a **Manage** toggle and a confirmation dialog

### Offline Caching

- Per-song audio cached in IndexedDB
- Downloads run as a background job with batch progress
- Offline state surfaced per row, per album ring, and in the sidebar queue
- Local and sync-device songs count as available without a cache entry

### Audio Playback

- Web Audio API playback engine
- Gapless playback support
- Queue management
- Volume and gain control
- Efficient buffering and scheduling
- Cache-first byte resolution for offline songs

### Visualizers

- Plugin system with ZIP installation
- Canvas and shader runtime hosts
- Per-plugin settings and file storage
- Example visualizer seeded on first run

### Custom Themes

- Theme packages are ZIP files with a `manifest.json`, a `theme.xml` and an
  optional layout per form factor (`desktop`, `tablet`, `mobile`, `tv`)
- A theme with no layouts is a palette swap: the built-in UI takes its
  colors and fonts
- `theme.xml` declares colors, light and dark palettes, metrics, fonts, text
  styles, brushes, shadows, and button, slider and panel styles with states
- Layouts arrange the shell and pages from layout elements (`Grid`, `Stack`,
  `DockPanel`, `Panel`, `Tabs`, `Button`, `Text`, `Image`, `PageHost`) and
  18 theme widgets (track list, library browser, playlists, search, play
  queue, seek bar, volume, artwork, lyrics, visualizer, sync queue, devices,
  metadata editor and more)
- Install from Settings → Extensibility; a 15-second keep-or-revert trial
  bar guards every switch, and `?theme=default` starts in safe mode
- Every package is validated (archive, manifest, XML, layouts, references,
  ranges) and compiled to a Theme IR before it is stored
- Themes paint on first load from a local mirror, without flashing the
  default UI
- The form factor is picked from the viewport; phone-width screens always
  get the mobile layout, even when the TV override is stored
- Example themes: **Classic Blue** (flat desktop layout) and **Tonal**
  (tonal light/dark surfaces with a phone layout: top app bar, bottom
  navigation bar, mini-player card), plus **Sage**, a palette-only theme
  with light and dark sage-green palettes and no layouts
- The theme specification and authoring guides live in
  [`docs/themes/`](docs/themes/README.md), including a prompt for generating
  themes with AI and a guide for creating new widgets

### Metadata

- Track metadata editing
- Album artwork management
- Automatic metadata parsing
- Bulk metadata operations

### Background Jobs

Long-running work runs in a web worker pool and reports progress through notifications:

```text
Thumbnail Generation
Bulk Import
Bulk Edit
Device Sync
Device Remove
Source Remove
Offline Download
```

## Architecture

```text
Web Media Manager
│
├── Application
│   ├── React 19
│   ├── TypeScript
│   └── Vite (vite-plus)
│
├── Playback Engine
│   ├── Web Audio API
│   ├── Queue Management
│   └── Audio Scheduling
│
├── Library
│   ├── Artists
│   ├── Albums
│   ├── Tracks
│   ├── Genres
│   └── Playlists
│
├── Music Sources
│   ├── Local folder
│   ├── Subsonic
│   └── Sync device
│
├── Device Support
│   ├── iPod (itunesdb-ts)
│   ├── Zune (zunesync-ts)
│   ├── MTP
│   └── Sync Engine
│
├── Themes
│   ├── Package validation and IR compiler
│   ├── Token runtime and first-paint mirror
│   ├── Layout renderer and stylesheet builder
│   ├── Theme widgets (src/components/theme-widgets)
│   └── Public API (src/core/themes)
│
├── Workers
│   ├── Job pool
│   └── Per-job strategies
│
└── Persistence
    ├── Dexie (wmm.music)
    ├── Secrets
    └── Settings
```

## Current Development Status

### Core Application

```text
React application shell
Library browsing (songs, albums, artists, playlists)
Track management
Playlist management
Search and filtering
Sorting infrastructure
Right sidebar for playlists and the sync queue
```

### Playback

```text
Web Audio playback
Queue management
Timing optimization
Gain control
Playback state management
Buffering indicator
```

### Music Sources

```text
Local folder, Subsonic, and sync-device kinds
Capability flags per source
Silent startup resync
Background refresh job
```

### Device Support

```text
Classic iPod synchronization (nano 3G-7G, classic, photo, video, mini, shuffle, touch)
Zune synchronization over MTPZ
Generic MTP / mass-storage devices
iTunesDB read/write — Apple-compatible 5-section layout (4,1,3,2,5)
ArtworkDB read/write — per-format thumbnails (RGB565/RGB555/UYVY/I420)
Device detection from SysInfo / model number / USB product id
Transactional sync (Itdb): atomic save, .tmp + rename, iTunesDB committed last
Device-keyed checksums — hash58 (HMAC-SHA1) + hash72 (AES-128-CBC signature)
Byte-preserving round-trips of Apple-accepted databases
Browser + Node + Tauri runtimes (pure-ArrayBuffer core, pure-JS AES-ECB)
```

The iPod core lives in `packages/itunesdb-ts` — parse/write iTunesDB
and ArtworkDB, device detection, artwork processing, and the high-level
`Itdb` sync engine. The app's sync flow (add device → scan → choose
folder → sync songs → artwork + audio + DB in one transaction) is
functional end to end.

```text
Verified so far
  - Device add flow (USB picker -> folder picker -> scan -> persist)
  - Reader: tracks / albums / playlists / artwork, per-format thumbnails
  - Writer: Apple-compatible section order, master-in-both-sections,
    shared id counter, fresh-track constants (type1/type2, unk144,
    dbid2, filesize2, library-id mirror), byte-identical round-trips
    of Apple-accepted DBs (0 diffs outside checksum)
  - hash58 + hash72 validity on device DBs; HashInfo pair persistence
  - Sync-time cleanup: stale MP3s + orphaned thumbnail/ithmb files
  - Playlist hygiene: OTG list drop, "Videos"-style duplicate dedupe
Open item
  - Apple Music / Finder occasionally still flag "restore" after an
    app-written DB; the library bytes round-trip identically and the
    checksums verify, but Apple's daemon validation is stricter — see
    the Apple Compatibility Notes in the package README for the
    byte-level facts established so far.
```

### Offline Caching

```text
Per-song cache in the offlineAudio table
Worker download job with per-song batch progress
Cache-first byte resolution during playback
Offline state in the song table, album ring, and sidebar queue
```

### Visualizers

```text
ZIP plugin installation
Canvas and shader runtime hosts
Per-plugin settings and file records
Example plugin seeded when the plugin is absent
```

### Themes

```text
Theme spec 1.0 (docs/themes)
Package checks, theme.xml and layout validators, Theme IR compiler
Dexie theme store, install from ZIP, keep-or-revert trial, safe mode
Palette, font and color scheme tokens with a localStorage first-paint mirror
Layout renderer for desktop, tablet, mobile and TV layouts
Stylesheet builder for button, slider and panel styles and their states
18 theme widgets, each a definition.ts plus a component
Widgets built only on the src/core/themes public API (guard test enforced)
Example themes: Classic Blue (desktop), Tonal (desktop + mobile), Sage (palette only)
```

````

### Performance

```text
Memoized table rendering
Parent-controlled state
Virtualization-ready architecture
Stable object identity optimization
React render reduction
````

## Persistence

The application database is Dexie-backed under the name `wmm.music`,
currently at schema version 1:

```text
sources        songs          songArtwork    playlists
jobs           playHistory    plugins        pluginFiles
pluginSettings offlineAudio   themes         themeFiles
themeSettings
```

The schema is edited in place while the application is unreleased — there
are no migration steps. Changing a store definition requires deleting the
`wmm.music` database so it is recreated at the new shape.

Credentials are kept out of the application database and stored separately
under the `wmm.secrets.<namespace>` naming convention.

## Development

Requires Node 26 or newer.

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build application:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Lint:

```bash
npm run lint
```

Rebuild the example theme packages in `public/themes/` after editing
`examples/themes/`:

```bash
npm run build:themes
```

Sync translation packs after adding UI strings:

```bash
npm run i18n:sync
```

Start in safe mode (built-in UI, custom theme ignored):

```text
http://localhost:5173/?theme=default
```

## Debugging

Start development server and attach debugger:

```text
F5
```

VS Code is configured to:

1. Start the Vite development server
2. Launch Microsoft Edge
3. Attach the debugger to the running application

## Project Goals

- Modern replacement for legacy media managers
- First-class Classic iPod support
- High-performance media library management
- Extensible synchronization architecture
- Cross-platform operation
- Large-library performance at scale

## Roadmap

### Near Term

```text
- Smart playlist rule decoding
- Library import improvements
- Gapless metadata (mp4g) writing for synced files
```

### Long Term

```text
- Full iTunes-session sync handshake parity
- Additional portable media devices
- Enhanced metadata tools
- Native application packaging
```

## VS Code Configuration

This configuration is helpful for starting the app in debug mode

### launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Vite App",
      "type": "msedge",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}",
      "preLaunchTask": "vite",
      "postDebugTask": "terminate all tasks"
    }
  ]
}
```

### tasks.json

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "vite",
      "type": "npm",
      "script": "dev",
      "isBackground": true,
      "problemMatcher": {
        "owner": "vite",
        "pattern": {
          "regexp": "."
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": ".",
          "endsPattern": "ready in"
        }
      }
    },
    {
      "label": "terminate all tasks",
      "type": "shell",
      "command": "${command:workbench.action.tasks.terminate}",
      "args": ["vite"]
    }
  ]
}
```
