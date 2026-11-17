# 03 · Layout specification (desktop.xml, tablet.xml, mobile.xml, tv.xml)

All four layout files share **one grammar**. They differ only in the `formFactor` attribute,
in when the host selects them, and in the advisory rules the validator applies per form factor.

## Root

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
  <Shell>
    … persistent element tree, containing at most one <PageHost /> …
  </Shell>
  <Page id="library" role="library" titleKey="navigation.library" default="true"> … </Page>
  <Page id="now-playing" role="nowPlaying" titleKey="navigation.nowPlaying"> … </Page>
</Layout>
```

- `formFactor` must match the file name (`desktop.xml` → `desktop`; `E6001` otherwise).
- `<Shell>` (required) holds exactly one root element. It is always visible.
- `<Page>` elements are optional. If any exist, the Shell must contain exactly one `<PageHost/>`,
  and that is where the current page renders. With no pages, the Shell is the whole layout,
  which suits single-window skins.

### Pages

| Attribute | Rules |
|-----------|-------|
| `id` | Required, unique within the layout. Kebab-case. |
| `titleKey` | Required resource key. Used for the document title and accessibility announcements. |
| `role` | Optional, unique. `library` · `artists` · `albums` · `playlists` · `nowPlaying` · `sync`. Tells the host which page satisfies an app navigation intent, e.g. "Show album" opens the `library`, `albums` or `artists` page, whichever exists first. Intents with no matching role open the host's fallback view. |
| `default` | Boolean. Exactly one page has it, or the first page is the default. |
| `presentation` | `page` (default) · `overlay`. An `overlay` page covers the Shell instead of rendering in the `PageHost`, and leaving it returns to the page underneath. Only allowed on the `nowPlaying` role in v1 (see [pages/playback.md](pages/playback.md#4-the-now-playing-page)). |

A page has exactly one root element. Pages switch through the theme-invokable command
`wmm.ui.navigate` with `commandParameter="<page id>"`. The validator checks that the id
exists (`E6020`). The host remembers the last page per layout.

## Common layout attributes

Every primitive, control and widget accepts these:

| Attribute | Type | Notes |
|-----------|------|-------|
| `id` | kebab-case | Optional, unique per file. Unused in v1 except for diagnostics. Reserved as the target for future bindings and states. |
| `width`, `height` | Length · `auto` | Default `auto`. |
| `minWidth`, `minHeight`, `maxWidth`, `maxHeight` | Length | |
| `margin` | Thickness | |
| `hAlign`, `vAlign` | `stretch` · `start` · `center` · `end` | Default `stretch`. |
| `dock` | `top` · `bottom` · `start` · `end` · `fill` | Only on children of `DockPanel`. |
| `row`, `column`, `rowSpan`, `columnSpan` | integer ≥ 0 / ≥ 1 | Only on children of `Grid`. |
| `grow` | integer 0–100 | Only on children of `Stack`. Share of leftover space. |

Using a parent-specific attribute under the wrong parent is an error (`E6030`). That catches a
very common authoring mistake early.

## Layout primitives

### Panel

A decorated container with **zero or one** child.

```xml
<Panel style="@panel/chrome" padding="8"> … </Panel>
```

`style` (`@panel/…`) plus inline overrides of any panel style property (`background`, `border`,
`borderWidth`, `cornerRadius`, `padding`, `shadow`). Inline overrides exist so authors don't
create a one-off style for every spacing tweak.

### Stack

Arranges children in a line.

```xml
<Stack orientation="horizontal" gap="4" align="center" overflow="clip"> … </Stack>
```

`orientation`: `horizontal` · `vertical` (default). `gap`: Length. `align` (cross axis):
`stretch` · `start` · `center` · `end`. `justify` (main axis): `start` · `center` · `end` ·
`spaceBetween`. `overflow`: `clip` · `scroll`. `wrap`: Boolean (horizontal only).

### DockPanel

Children are docked to edges, in document order. The remaining space goes to the `fill` child.

```xml
<DockPanel>
  <Panel dock="top" height="56"> … </Panel>
  <Panel dock="bottom" height="72"> … </Panel>
  <Panel dock="start" width="220"> … </Panel>
  <TrackList dock="fill" />
</DockPanel>
```

At most one `fill` child. If none is marked, the last child fills. `start`/`end` follow reading
direction.

### Grid

```xml
<Grid columns="220 1* 2*" rows="auto 1*" columnGap="4" rowGap="4">
  <SearchBox row="0" column="0" columnSpan="3" />
  <LibraryBrowser row="1" column="0" />
  <TrackList row="1" column="1" columnSpan="2" />
</Grid>
```

Tracks: a Length (fixed px), `auto` (content size), or `N*` (star share, N = 1–100). 1–12
columns and 1–12 rows. Omitted `rows`/`columns` mean one `1*` track. A child's `row` and
`column` default to 0 and its spans to 1. The cell and span must lie inside the grid (`E6041`). Overlapping
children are allowed, with later ones drawn on top, which enables layered skins.

## Controls

### Button

```xml
<Button command="wmm.playback.playpause" labelKey="playback.playPause"
        icon="@icon/playPause" style="@button/transport" display="icon" />
<Button command="wmm.ui.navigate" commandParameter="library"
        labelKey="navigation.library" icon="@icon/library" display="iconAndLabel" />
```

| Attribute | Rules |
|-----------|-------|
| `command` | Required. Must be in the **theme-invokable command list** of the target app version (`E6050`). |
| `commandParameter` | Required if and only if the command declares a **literal parameter**, and validated against that command's parameter domain (for example, `wmm.ui.navigate` takes a declared page id and `wmm.playback.seekBy` takes a whole number of seconds). The page documents list every domain. |
| `labelKey` | Required resource key. The accessible name and, depending on `display`, the visible label. Must be a `text` resource. Template and plural keys need runtime values and are invalid in v1 (`E6012`). |
| `tooltipKey` | Optional resource key. Defaults to `labelKey`. |
| `icon` | `@icon/…` or `@image/…`. |
| `display` | `icon` · `label` · `iconAndLabel` (default `iconAndLabel`). With `icon`, the label still exists for assistive technology. |
| `style` | `@button/…`, plus inline overrides of button style properties (not states). |

**Theme-invokable commands.** The command catalog is defined page by page, in the documents
under [pages/](pages/). Each catalog entry gives the command's parameter domain, its host-driven
states and its availability per form factor. The catalog grows in minor versions and never
shrinks within a major. Commands needing runtime data, such as `wmm.playback.playSong`
(`songId`), `wmm.sync.sync` (`deviceId`) or `wmm.visualizer.select` (`pluginId`), stay
widget-internal until bindings exist.

Cross-page commands: `wmm.ui.navigate` (new, parameter: a page id declared in the same
layout) and `wmm.ui.openSettings` (exists, no handler yet).

### Text

```xml
<Text resourceKey="library.artists" style="@text/title" />
<Text literal="CLASSIC" style="@text/logo" />
```

- Exactly one of `resourceKey` (a `text` resource) or `literal`.
- `literal` is for brand marks only: ≤ 32 characters, no control characters, and an info issue
  (`I6060`) is always raised so gallery reviewers see it. It is never translated.
- Dynamic text (track title, counts) belongs to widgets in v1.

### Image

```xml
<Image source="@image/logo" fit="contain" decorative="true" />
<Image source="@image/badge" altKey="app.title" />
```

`source` (`@image/…`, required). `fit`: `none` · `stretch` · `cover` · `contain` · `nineSlice`.
Exactly one of `decorative="true"` or `altKey`. That forces an explicit accessibility decision.

### Icons

`@icon/…` names a host-owned vector icon, tinted with the button or text foreground. The v1.0
set: `play`, `pause`, `playPause` (swaps with `active`), `stop`, `next`, `prev`, `shuffle`,
`repeat`, `volume`, `mute`, `search`, `settings`, `sync`, `device`, `library`, `artists`,
`albums`, `playlists`, `nowPlaying`, `visualizer`, `edit`, `add`, `close`, `back`, `menu`, `more`,
plus, from the playback page: `queue`, `lyrics`, `fullscreen` (swaps on `active`), `darkRoom`,
`seekForward`, `seekBack`, `favorite`. `repeat` swaps to repeat-one on `active=one` and `mute`
swaps on `active`. The set grows additively.

### Tabs

A fifth primitive, approved during the playback page review. It is defined in [pages/playback.md § 4.4](pages/playback.md#44-tabs-new-primitive).

## Widgets

Widgets are app-implemented components with **fixed contracts**. A theme places and sizes
them, picks from a closed set of options, and styles them through the palette plus a few
named style slots. Widgets render with ShadCN primitives reading the palette slots, so they
match any theme without per-widget authoring.

Shared widget attributes: all common layout attributes, plus `panel` (`@panel/…`, the widget's
outer chrome) and `density` (`compact` · `comfortable`, default from form factor).

| Widget | Purpose | Options | Style slots | Min size | Cardinality |
|--------|---------|---------|-------------|----------|-------------|
| `LibraryBrowser` | Navigate artists, albums, genres and playlists. Selection drives `TrackList`. | `views` (ordered subset of `artists albums genres playlists songs`), `initialView`, `display` (`list` · `grid`), `artwork` (Boolean) | `itemText`, `headerText` (`@text/`) | 160×160 | 1 per page |
| `TrackList` | Songs for the current selection on the same page: the `LibraryBrowser` selection, or the playlist picked in a `Playlist`. With neither on the page, all songs. | `columns` (ordered subset of `title artist album albumArtist genre year track disc duration offline source`), `alternateRows` (Boolean), `showHeader` (Boolean) | `rowText`, `headerText`, `alternateBrush` (`@brush/`) | 240×120 | 1 per page |
| `Playlist` | The playlists list. (The play queue is `PlayQueue`, a playback widget.) | `artwork` | `rowText` | 160×120 | 1 per page |
| Playback widgets | `NowPlaying`, `Artwork`, `TrackInfo`, `SeekBar`, `PlaybackTime`, `VolumeControl`, `PlayQueue`, `Lyrics`, `Visualizer` | Defined in [pages/playback.md](pages/playback.md#3-widgets) | | | |
| `MetadataEditor` | Edit the selected songs' tags. | `mode` (`quick` · `full`) | `labelText` | 240×200 | 1 per layout |
| `SyncQueue` | Songs queued for device sync. | `summary` (Boolean) | `rowText` | 200×120 | 1 per page |
| `DevicePanel` | Connected devices and storage. | `storage`, `allowAdd` (Booleans) | `titleText` | 200×80 | 1 per page |
| `SearchBox` | Library search input. | `scope` (`library` · `sync`), `placeholderKey` (resource key) | n/a | 120×32 | 1 per scope per page |

Rules:

- Widgets have **no children** (`E6070`).
- Unknown widget options are errors, not warnings. Options are a typed contract, and a typo
  that silently does nothing is worse for authors.
- The Shell counts as a page for cardinality, and a widget in the Shell counts against every page.
- A fixed `width`/`height` below the widget minimum is a warning (`W6071`). The host enforces the
  minimum at render time.
- Each widget catches its own errors at render time. A failing widget renders a neutral
  placeholder, never a blank app.

## Host chrome (not themable)

The host always owns: dialogs and popovers (they use the palette), toasts, context menus, the
Settings page, the theme-trial confirmation bar, and the **system button**. The system button
is a small settings affordance the host overlays in the top-end corner, unless the layout
contains a reachable `Button command="wmm.ui.openSettings"` in the Shell (`W6080` if it is only
on some pages). `Ctrl/Cmd+,` always opens Settings.

## Form factors

There are four form factors: `desktop`, `tablet`, `mobile` and `tv`. The host picks one from
two signals, viewport width and **primary pointer type** (CSS `pointer`: `fine` for a mouse or
trackpad, `coarse` for touch, `none` for remote-only devices). These are the same signals the
app already uses (`src/lib/hooks/useIsMobile.ts`, `src/lib/tv/detectTv.ts`). Themes never see
the signals, only the resolved form factor.

The user can pin a form factor in Settings (`Automatic` · `Desktop` · `Tablet` · `Mobile` · `TV`).
A pin overrides detection completely.

### Resolution (automatic), first match wins

| # | Form factor | Rule |
|---|-------------|------|
| 1 | `tv` | The TV override is on (`?tv=1`, remembered across loads and dropped on a device with a fine pointer and no TV user agent), **or** the user agent names a TV platform, **or** `pointer: none` and width ≥ 960 px |
| 2 | `mobile` | width < 640 px (any pointer) |
| 3 | `mobile` | `pointer: coarse`, landscape, height ≤ 500 px (a phone turned sideways) |
| 4 | `tablet` | 640 ≤ width < 1024 px (any pointer) |
| 5 | `tablet` | `pointer: coarse` and 1024 ≤ width ≤ 1366 px (a tablet in landscape) |
| 6 | `desktop` | Everything else |

Notes:

- Rule 5 is why pointer type matters. A landscape tablet is as wide as a laptop, and only the
  coarse pointer tells them apart, so laptops stay on `desktop`.
- Rule 3 is a **change from the current app**, which shows the tablet chrome for a phone in
  landscape. A tablet layout can't fit a 390 px tall viewport, and the mobile layout is designed
  for small heights. *Open for review.*
- A narrow desktop window (fine pointer, width < 640) resolves to `mobile`, as it does today.
  The touch-target advisories still apply, because the same file serves phones.
- Detection re-runs on resize, orientation change and pointer-capability change. Switching
  form factor swaps the layout in place, and widget state survives (see [07](07-installation-runtime-sdk.md)).

| File | If the file is absent |
|------|-----------------------|
| `desktop.xml` | n/a (required) |
| `tablet.xml` | Host's built-in tablet layout, with the theme's tokens and styles |
| `mobile.xml` | Host's built-in mobile layout, with the theme's tokens and styles |
| `tv.xml` | Host's built-in TV layout, with the theme's tokens and styles |

A missing form factor never falls back to scaling another form factor's layout. A desktop skin
squeezed onto a phone or seen from across a room is unusable, while a built-in layout with the
theme's colors and fonts is coherent. The breakpoints and resolution order are frozen for major
version 1.

### Input model per form factor

| Form factor | Primary input | Hover | Focus | Host-applied insets |
|-------------|---------------|-------|-------|---------------------|
| `desktop` | Fine pointer and keyboard | Yes | Keyboard focus ring | None |
| `tablet` | Touch | Ignored | Rare (hardware keyboard) | Safe area |
| `mobile` | Touch | Ignored | Rare | Safe area, dynamic viewport height |
| `tv` | D-pad remote (spatial focus navigation) | Ignored | **Always visible**: the focused element is the cursor | Overscan (5% each edge) |

"Ignored" means the host doesn't apply the `hover` button state on that form factor, even if the
theme declares it, because touch and remote devices report hover inconsistently.

### desktop.xml

Expected input is a pointer and keyboard. All primitives and widgets are allowed. Typical
structure: DockPanel shell, side `LibraryBrowser`, `TrackList` fill, `NowPlaying variant="bar"`.
Advisories: a desktop layout that doesn't fit in 1024×640 (the summed fixed sizes overflow)
raises `W6090`.

### tablet.xml

Expected input is touch, in both orientations. Same grammar. Advisories: button `minHeight` and
`minWidth` below 44 raise `W6091`. The host applies safe-area insets to the Shell root.
`density` defaults to `comfortable`. A layout that only works in landscape (fixed width > 640)
raises `W6092`. Orientation-specific variants are reserved for a later minor version.

### mobile.xml

Expected input is touch, one column, portrait first. Same grammar and the same touch-target
rule as tablet. Additional advisories:

- A Grid with more than 2 star columns, or any fixed width > 360 below the Shell root: `W6093`.
- `Visualizer` or `MetadataEditor` placed in the Shell: `W6094`. They belong on their own pages.
- Recommended pattern: a vertical DockPanel Shell with `PageHost` as fill and a bottom navigation
  `Stack` of `wmm.ui.navigate` buttons, using the host-driven `selected` state.

The host applies safe-area insets (notch, home indicator) to the Shell root and sizes the root
with dynamic viewport units. Themes don't need to and cannot do this themselves.

### tv.xml

Expected input is a D-pad remote with Select, Back and media keys, viewed from about 3 m (the
"10-foot" experience). Same grammar. The host owns all remote handling. Themes can't bind keys,
and these host behaviors apply to every TV layout:

- **Spatial focus navigation.** Arrow keys move focus to the nearest focusable element in that
  direction, and Select activates it. Every `Button` and every interactive widget is focusable.
  Document order breaks ties, so authors control ordering through tree order.
- **Initial focus.** The first focusable element of the current page, or of the Shell if the page
  has none. A future minor version may add an `initialFocus` attribute (reserved).
- **Back** closes the topmost overlay, then leaves the Now Playing page, then goes back a page.
- **Media keys** map to playback commands (see [pages/playback.md](pages/playback.md#5-remote-and-keyboard-input)).
- **Overscan.** The host insets the Shell root by 5% on each edge.
- **Fullscreen.** The host prompts to enter fullscreen once, except in hosted TV shells.
- **Visualizer.** The host lowers the render scale and frame rate on TV. Themes don't control this.

Grammar rules specific to `tv` (errors, because the layout is unusable otherwise):

- `display="icon"` buttons must still have a `labelKey` (always required), and on TV the host
  shows the label as a tooltip-style caption under the focused button.
- Widgets with text entry (`SearchBox`, `MetadataEditor`) are invalid in `tv.xml` (`E6095`). TV text
  entry uses the host's on-screen search flow.

Advisories:

- A `ButtonStyle` used on TV whose `focused` state changes only `shadow` or `opacity`: `W6096`.
  Focus must be readable at 3 m, so change `background`, `border` or `image`. The host still
  draws its focus ring when the style changes neither `border` nor `shadow` (see 02).
- Text styles used in `tv.xml` below 18 px: `W6097`.
- Focusable elements smaller than 48×48: `W6098`.
- More than 3 Grid star columns at any level: `W6099`. TV layouts are read from a distance.
- Recommended pattern: a top navigation `Stack` of `wmm.ui.navigate` buttons in the Shell, with
  card-style content on pages, and Now Playing as a full-screen page (see
  [pages/playback.md](pages/playback.md)).

`density` defaults to `comfortable` on TV, and the host scales `comfortable` row heights for
TV the same way it does today.
