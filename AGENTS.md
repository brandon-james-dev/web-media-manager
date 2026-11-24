# AGENTS.md

Instructions for AI agents working in this repository. Read this first, then
`ARCHITECTURE.md` for how the layers fit together.

## Project

Web Media Manager — a browser-based music library manager and device sync app
(React 19 + TypeScript + Vite via `vite-plus`, Tailwind CSS v4, Dexie/IndexedDB,
Web Audio API). Node 26 (`.nvmrc`). Deployed to GitHub Pages as an offline PWA.

## Commands

```bash
npm run dev            # vite dev server (PWA service worker disabled in dev)
npm run build          # tsc -b && vp build
npm run build:github   # tsc -b && vp build --mode github-pages (base /web-media-manager/)
npm run lint           # vp lint (oxlint; 0 warnings expected)
npx vp fmt             # format with oxc (alias: vp format)
npx vp check           # format + lint + type checks in one pass
npx tsc -b             # typecheck only, project references
npm test               # vitest run (124 files, node environment)
npx vitest run src/core/contracts/combine.test.ts   # single file
npm run i18n:sync      # regenerate locale CSVs from the resource registry
npm run build:plugins  # pack examples/visualizers -> public/plugins
npm run build:themes   # pack examples/themes -> public/themes
```

`npm run build` is the gate that matters: it runs `tsc -b` first, so a type
error fails the build before Vite starts.

## Layout

| Path                            | Contents                                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/`                     | Public, transport-neutral domain API mirroring Open Subsonic (system, browsing, searching, scanning, media, metadata, playlists, jobs, themes, visualizers, ui) plus `contracts/` and `ports/` |
| `src/lib/`                      | Implementations behind the ports: persistence (Dexie/file/browser), metadata reader+writer, sources, sync, themes pipeline, visualizers runtimes, background jobs, keyboard shortcuts, offline |
| `src/events/`                   | `WmmBus` (RxJS), command/event taxonomy, dispatch, job + notification wiring                                                                                                                   |
| `src/providers/`                | React providers: playback, songs, sync, visualizers                                                                                                                                            |
| `src/components/`               | Feature components, one folder per concept; `ui/` holds shadcn primitives                                                                                                                      |
| `src/components/theme-widgets/` | Widgets a theme layout can render, registered via `registerAppThemeWidgets()`                                                                                                                  |
| `src/pages/`                    | Route screens (`Main/`, `Tv/`, `Settings.tsx`)                                                                                                                                                 |
| `src/models/`                   | UI binding models only (Song, Album, Artist, Playlist, Sync*)                                                                                                                                  |
| `src/dto/`                      | Per-form DTOs (QuickEditDto, SongEditDto, AlbumDetailDto)                                                                                                                                      |
| `src/workers/`                  | Worker pool, adapter, `metadata.worker.ts`, `shared/` job bodies                                                                                                                               |
| `src/i18n/`                     | Resource registry, English pack, CSV language packs, service, hook                                                                                                                             |
| `docs/`                         | Contract docs: `events-taxonomy.md`, `resources-i18n.md`, `themes/`                                                                                                                            |
| `examples/`                     | Example visualizer plugins and themes, packed by the build scripts                                                                                                                             |
| `scripts/`                      | `i18n-sync.ts`, `build-example-plugins.mjs`, `build-example-themes.mjs`                                                                                                                        |

## Conventions

- Import through the `@/*` alias (`@/core`, `@/lib/...`), never deep relative
  paths across top-level folders. Every folder has an `index.ts` barrel.
- **`src/core` is the public API.** Components and theme widgets call core
  commands, not `@/lib` internals. Allowed component-level `@/lib` exceptions
  are the theme render host (`@/lib/themes/render/browser`, `runtime`,
  `getThemeManager`) and shadcn utils; `widgetDefinitions.test.ts` enforces it.
- Never hardcode user-facing text. Add the key to `src/i18n/resources.ts` and
  `src/i18n/en-US.ts`, run `npm run i18n:sync`, then fill the language column
  in `src/i18n/locales/<tag>.csv`.
- Tests are `*.test.ts` colocated with the source, `environment: "node"`, and
  cover pure logic only — there is no DOM test setup, so a `.test.tsx` would
  not even be collected.
- Formatting is oxc's Oxfmt, run through `vp fmt` (check with `vp fmt --check`)
  — not Prettier. The `.prettierrc` in the repo is vestigial; do not treat it as
  the source of truth. `vendor/` and `dist/` are lint-ignored.
- **There is no Oxfmt config file**, so `vp fmt` falls back to its defaults
  (100-column print width) and reformats the whole file away from the repo's
  80-column style. Do not run it over existing files until a config exists;
  format only new files, or add the config first.
- Public modules carry JSDoc with `@example` blocks (XML and TS for theme
  code); enums are `const` objects, not TS `enum`.
- UI primitives live in `src/components/ui` (shadcn `base-nova` style on
  `@base-ui/react`, lucide icons). A `Button` rendered as an anchor needs
  `nativeButton={false}` or Base UI logs a console error.
- **z-index comes from the named scale in `src/index.css`** (`z-sticky`,
  `z-raised`, `z-sheet`, `z-chrome-row`, `z-overlay`, `z-chrome`, `z-modal`,
  `z-popover`, `z-toast`). Pick the layer by role; never add a raw number or a
  per-call-site override. The album detail sheet is non-modal and must stay
  below `z-chrome-row` and `z-chrome`.
- Commit messages are capitalized past tense with no prefix: `Added song-hiding
  feature`, `Fixed all artists view render timing`.
- Do not name commercial products in code comments; describe the behavior.

## Gotchas

- **Zero warnings.** `npm run lint`, `npx tsc -b`, IDE diagnostics and the
  browser console must all be clean for the views you touched before reporting
  done. Fix the cause; do not suppress.
- **Worker safety.** `src/workers/shared/*` and the `@/lib/sources` barrel are
  imported by web workers. A barrel they reach must not re-export a `.tsx`
  module — in dev that pulls `/@react-refresh`, which reads `window` and kills
  every worker at boot. Import `I18nProvider` from `@/i18n/I18nProvider`, not
  `@/i18n`.
- **No `using` declarations anywhere in `src`.** Safari has never shipped
  explicit resource management; it is a parse error there. Use `const` +
  `try/finally` + `Symbol.dispose()`.
- **Dexie schema is version 1 and edited in place** (`WmmMusicDb`). Adding a
  table means editing the `version(1).stores({...})` block and deleting the
  `wmm.music` database in the browser; there are no upgrade steps yet.
- **Build-time defines** `__APP_VERSION__`, `__APP_BUILD_TIME__`,
  `__APP_COMMIT_HASH__` are declared in `src/global.d.ts` and injected by
  `vite.config.ts`. `vitest.config.ts` must define them too or tests fail to
  resolve. Read them through `system.WMM_*` in `@/core`, not the globals.
- **Feature-detect browser APIs.** WebUSB (`"usb" in navigator`) is
  Chrome-only; File System Access is absent in Safari/Firefox. Both must be
  gated, and `localStorage` access goes through the safe-storage guard
  (Safari private mode throws).
- `vite.config.ts` suppresses "externalized for browser compatibility"
  warnings for `itunesdb-ts`, `taglib-wasm`, `sharp` and `detect-libc`. Those
  Node paths are never called in the browser; do not "fix" them.
- `dist/` is build output. `public/plugins/*.zip` and `public/themes/*.zip` are
  generated by the `build:*` scripts from `examples/`.
- Verify UI changes in a real browser. Passing gates did not catch past white
  screens and silently failing imports in the source/worker layers.
