# 07 · Installation workflow, runtime architecture and SDK

## 11. Theme installation workflow

Themes reuse the visualizer plugin pipeline: the same ZIP reader and path rules, the same
manifest envelope (`kind: "theme"`, already declared in `PluginKind`), and the same
`plugins` / `pluginFiles` storage. Theme-specific pieces are a validator, a compiler and a
compiled-IR cache.

```
 User picks .zip (Settings ▸ Extensibility ▸ Custom themes ▸ Install theme)
        │
        ▼
 [Worker] 1. Read archive ────────── stage 1 (archive rules)
        │ 2. Parse manifest ──────── stage 2; existing id? compare versions
        │ 3. Parse + validate XML ── stages 3–4 (pure parser with line/column; no DOMParser, so it runs in a worker and on non-browser platforms)
        │ 4. Validate assets ─────── stage 5 (decode images, parse fonts, sanitize SVG)
        │ 5. Semantic + advisory ─── stages 6–7 against the running app's contracts
        │ 6. Compile ─────────────── Theme IR (normalized JSON, all references resolved)
        ▼
 Review dialog: name, author, version, previews, warnings, update/downgrade notice
        │  Errors? ── show the issue list, nothing stored
        ▼
 Store (one Dexie transaction): package record + files (sanitized SVGs replace originals) + compiled IR
        │
        ▼
 Theme appears in Settings ▸ Extensibility ▸ Custom themes (not yet active)
```

### Activation and trial

- Choosing a theme in Settings ▸ Extensibility ▸ Custom themes applies it immediately, like
  choosing a visualizer, with no reload and no **Save Settings** step.
- A host-owned **trial bar** then appears:
  "Keep this theme? Reverting in 15 s · Keep · Revert". Without confirmation, the previous
  theme is restored. This guards against unreadable or broken themes.
- If the active theme causes two root-level render failures within 30 s of activation, the host
  reverts to the built-in theme and shows a notification. This is crash-loop protection.

### Updates, downgrades and removal

| Case | Behavior |
|------|----------|
| Same `id`, higher `version` | Update. Replaces the files and IR atomically. Stays active if it was active. |
| Same `id`, same `version` | Asks to reinstall. Useful for authors iterating. |
| Same `id`, lower `version` | Allowed after an explicit downgrade confirmation. |
| Remove the active theme | Switches to the built-in theme first, then deletes. |
| `wmm-` prefixed id | Reserved for built-ins. Install is refused (`E2003`). |

### Safe mode and recovery

- The URL flag `?theme=default` starts with the built-in theme without changing the stored
  preference.
- `Ctrl/Cmd+,` always opens Settings, and the Custom themes section always has
  **Reset to default theme**.
- Host chrome (Settings, dialogs, the trial bar, the system button) is never theme-laid-out.

### Compiled cache

The IR is cached under the key `(themeId, themeVersion, specVersion, irVersion,
validatorVersion, appContractsHash)`. On startup, a key mismatch triggers a background
re-validate and recompile from the stored original package (the original is always kept).
Meanwhile the previous IR renders if its `irVersion` still matches, otherwise the built-in theme
does. The active theme's IR is also mirrored to `localStorage` (size permitting), so the first
paint is themed without waiting on IndexedDB. That avoids a flash of the default theme.

## 12. Theme runtime architecture

### Layers

```
┌──────────────────────── core (framework-free, platform-neutral) ────────────────────────┐
│ component model ─► parser ─► validator ─► compiler ─► Theme IR (immutable, versioned)    │
│ ports: ThemeStore (persistence), AssetSource (bytes), ContractSource (keys/commands/...) │
└──────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────── host (browser today; Tauri/server later) ──────────────────────┐
│ ThemeService: install, list, activate, trial, safe mode, cache                          │
│ Token engine    IR tokens ─► CSS custom properties on the theme root                    │
│ Style engine    IR styles ─► one constructed stylesheet, host-generated class names     │
│ Asset manager   files ─► Blob URLs (ref-counted, revoked on switch); FontFace loading   │
│ Form-factor resolver   viewport + pointer + TV signals + pin ─► desktop|tablet|mobile|tv │
│ Layout renderer        IR node tree ─► element registry ─► components                  │
│ Widget registry        widget name ─► app component adapter (options ─► props)         │
│ State driver           bus events ─► host-driven button states (active, selected)      │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Core lives beside the existing core modules (as `src/core/visualizers` does) and is the code the
SDK publishes. The browser host lives in the app layer. Under the app's multi-client direction,
a Tauri or server host reuses core unchanged and supplies its own store and asset ports.

### Rendering rules

- **Tokens:** palette slots map onto the CSS variables the UI kit already reads (`--background`,
  `--foreground`, `--accent`, `--border`, `--ring`, ...). That re-colors dialogs, menus, Settings
  and widgets with no per-component work. Theme-specific tokens become namespaced variables
  (`--wmm-t-color-<hash>`). The default text style's font family is applied to the root element,
  and theme-only slots (`selection`, `selectionForeground`, `progressTrack`, `progressFill`)
  become `--wmm-<slot>` variables.
- **Styles:** each IR style compiles to rules in a single constructed stylesheet, including the
  `:hover`, `:active`, `:focus-visible` and `[data-state]` rules for button states. Class names
  are host-generated hashes. Author ids never appear in CSS. The only values written into CSS are
  produced by host serializers from typed IR values (hex colors, integers, keywords, host-created
  blob URLs).
- **Primitives:** `Stack` and `DockPanel` render as flexbox, `Grid` as CSS grid, and `Panel` as a
  styled box. Logical properties are used throughout, so right-to-left works.
- **Controls:** `Button` renders the app's button primitive with the style's class. A click invokes
  the command through the command dispatcher, after a runtime re-check against the
  theme-invokable list (cheap defense in depth). `Text` resolves keys through the i18n service, so
  a language change re-renders theme text like any other text.
- **Widgets:** each registry entry adapts IR options to an existing app component's props.
  Widgets are wrapped in an error boundary and a size-floor container.
- **Host-driven states:** the state driver subscribes to taxonomy events (e.g.
  `wmm.playback.started` / `paused`) and to the current page, then sets `data-state` on buttons.
  No theme logic is involved.
- **Switching** theme, form factor or color scheme swaps the IR or layout in place. Widget state
  (selection, scroll, playback) lives in providers, not in the layout tree, so it survives.

### Performance budgets

Theme switch < 100 ms excluding font loading. Initial themed paint adds < 16 ms over the
built-in theme. Asset Blob URLs are created lazily on first reference. Images above 2048 px
also get a downscaled variant at install time, used where the rendered size is smaller.

### Built-in theme

The current UI becomes the built-in theme `wmm-default`, expressed in the same IR. This
dogfooding proves that the spec can express the real app, and gives fallback layouts for any
missing tablet or mobile file.

### Suggested delivery phases

1. **Tokens only:** `manifest.json` + `theme.xml` (palettes, fonts, text styles) applied to the
   existing React layout. Useful immediately and exercises the whole pipeline.
2. **Styles:** button and panel styles applied to app chrome, plus images and brushes.
3. **Layouts:** primitives, controls, widgets and pages, with `wmm-default` expressed as XML.
4. **SDK public release:** CLI, schemas, preview lab, conformance suite.

## 13. Theme SDK architecture

| Package | Contents |
|---------|----------|
| `@wmm/theme-spec` | The component model, generated XSDs, the manifest JSON Schema, the issue-code table, and app-contract snapshots per app release (resource keys, theme-invokable commands, icons, widget options). |
| `@wmm/theme-core` | Parser, validator, compiler and IR types. **The same code the app runs**, published from the app's core module. |
| `@wmm/theme-cli` | The `wmm-theme` command. |
| Theme lab | A preview build of the app with fixture data, used by `wmm-theme preview`. |
| Editor support | An XML catalog and JSON Schema mapping. An optional language server built on theme-core gives cross-file `@kind/id` completion, go-to-definition and live diagnostics. |

### CLI

| Command | Purpose |
|---------|---------|
| `wmm-theme init [--template classic\|minimal\|mobile-first]` | Scaffold a package with schema associations and placeholder assets. |
| `wmm-theme validate [dir\|zip] [--app <version>] [--as <spec>] [--json]` | Run all stages. `--app` picks a contract snapshot. `--as` checks the ignorable-feature downgrade. `--json` gives machine output for CI. |
| `wmm-theme preview [dir]` | Start the theme lab with live reload. Includes form-factor, color-scheme and language switchers, an inline issue overlay, and a contrast inspector. |
| `wmm-theme pack [dir]` | Validate, then produce a deterministic `.wmmtheme.zip` (sorted entries, fixed timestamps), so builds are reproducible. |
| `wmm-theme upgrade [dir] --to <major>` | Run the major-version migrator on source files and print a report. |
| `wmm-theme contracts [--app <version>]` | List the usable resource keys, commands, icons and widget options. |

### In-app developer mode

Settings ▸ Extensibility ▸ Custom themes ▸ **Load theme from folder** (developer toggle) uses the File System
Access API the app already relies on. It watches the folder and re-validates and re-applies on
change, with no CLI needed. Folder themes are never persisted as installed themes.

### Theme lab fixtures

The lab uses a deterministic fixture library (artists, albums, long titles, missing artwork),
a fake sync device and a stub visualizer. Screenshots are reproducible, and authors can test
edge cases such as empty states and long localized strings.

### Conformance suite

A versioned folder of fixture packages, valid and invalid, each with its expected issue codes,
plus golden screenshots of the sample themes at each form factor. It runs in the app's CI and
the SDK's CI. A rendering change to a published v1 construct fails the build. That enforces
the "identical rendering within a major" promise.

### SDK versioning

SDK packages follow SemVer independently of the spec. Each SDK release declares the spec
versions and app-contract snapshots it supports. `@wmm/theme-core` and the app are released
from the same source, so the validator can never drift between them.
