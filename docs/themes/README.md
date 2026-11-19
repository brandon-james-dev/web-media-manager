# Web Media Manager Theme Specification 1.0

Status: **Draft for review** · Spec version `1.0` · XML namespace `urn:wmm:theme:1`

This folder is the normative specification for WMM theme packages. It is written
for three audiences: external theme authors, the people who maintain the theme
SDK, and the app engineers who implement the host.

## Documents

| # | Document | Covers (deliverables) |
|---|----------|-----------------------|
| 00 | [Principles and scope](00-principles.md) | Goals, non-goals, safety model, glossary |
| 01 | [Package and manifest](01-package-and-manifest.md) | 1. Package structure · 2. `manifest.json` |
| 02 | [theme.xml](02-theme-xml.md) | 3. Colors, fonts, images, brushes, styles |
| 03 | [Layouts](03-layouts.md) | 4–6. `desktop.xml`, `tablet.xml`, `mobile.xml`, `tv.xml`, form factor detection, primitives, controls, widgets |
| 04 | [Conventions and schema](04-conventions-and-schema.md) | 7. Naming conventions · 8. XSD strategy |
| 05 | [Validation](05-validation.md) | 9. Validation model, limits, issue codes |
| 06 | [Versioning and upgrades](06-versioning-and-upgrades.md) | 10. Versioning · 14. Upgrade strategy, reserved syntax |
| 07 | [Installation, runtime and SDK](07-installation-runtime-sdk.md) | 11. Install workflow · 12. Runtime architecture · 13. SDK |
| 08 | [Example: Classic Blue](08-example-classic-blue.md) | 15. A complete theme in the style of a 2000s desktop media player |
| 09 | [Generating a theme with an AI assistant](09-generating-with-ai.md) | A copy-paste prompt and the install-and-fix loop |
| 10 | [Creating a theme widget](10-creating-widgets.md) | For app engineers: adding a widget, the guard tests, and a prompt for AI coding agents |

### Page specifications (reviewed one at a time)

| Page | Status | Covers |
|------|--------|--------|
| [Playback](pages/playback.md) | Draft for review | Transport region, Now Playing page, playback commands, widgets, remote input, all four form factors |
| Library, Playlists, Sync, Settings entry points | Not started | |

## The contract in one page

- A theme is a **ZIP** containing `manifest.json`, `theme.xml`, `layouts/desktop.xml`
  (required), and optionally `layouts/tablet.xml`, `layouts/mobile.xml`, `layouts/tv.xml`, `assets/` and `previews/`.
- A theme is **data, not code**. There is no scripting, no expressions, no raw CSS, no
  HTML, and no way to name an arbitrary component. Each element and attribute has
  a closed, typed grammar.
- A theme can **reference** these application contracts, but never redefine them:
  - i18n resource keys (`playback.playPause`) for all text;
  - commands (`wmm.playback.playpause`), restricted to the theme-invokable subset;
  - widgets (`TrackList`), a fixed registry the app implements.
- `theme.xml` holds **design tokens and styles**: colors, palettes, fonts, text styles, images,
  brushes, and button/panel styles. Layout files hold **structure**: primitives, controls
  and widgets placed in a tree.
- The host compiles a validated package into an immutable **Theme IR** (intermediate
  representation). The renderer only ever consumes the IR, never XML. That boundary is what
  lets future spec versions coexist.
- The user can always get back to a working app. Settings stay reachable, a safe-mode
  start ignores the active theme, and trying a new theme reverts on its own unless the
  user confirms it.

## Version 1 boundaries

V1 supports colors, fonts, images, layouts, button styling, panel styling, text
styling and widget placement.

V1 deliberately excludes bindings, event triggers, animations, templates, per-widget
custom configuration beyond a fixed attribute set, and visual state transitions.
Their syntax is **reserved** now (see [06](06-versioning-and-upgrades.md#reserved-syntax)), so adding them
later is an additive minor or major change, never a reinterpretation of v1 files.

## Prerequisite app work (not part of the spec, required to ship it)

1. Mark commands as theme-invokable in `src/events/taxonomy.ts`. The default is no; the
   flag can only be set on commands that need no payload or take a literal enum payload.
2. Add one navigation command, `wmm.ui.navigate`, with payload `{ page: string }`, so
   layouts can switch between their declared pages (see [03 · Pages](03-layouts.md#pages)).
3. Create a widget registry in core: names, versions, allowed attributes, and the styling
   slots each widget reads.
4. Add an optional `themeInvokable` / `themeSafe` export to the resource registry, so
   resource keys can be published to the SDK.
