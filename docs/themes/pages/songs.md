# Page spec · Songs

Status: **Approved** · Applies to spec `1.0`

The Songs page is the app's home page on desktop, tablet and mobile: every song in the library,
filtered by the search box and the source filter. On TV it is the "All songs" view reached from
the TV home tiles. It is also the first page the theme runtime renders from XML (see
[section 12](#12-first-pipeline-target)).

The page has three parts:

1. **The library header.** Today the desktop header row: Songs / Albums / Artists, search with the
   source filter, the Edit toggle, Playlists and Sync, and the sidebar toggle. Tablet and mobile
   move navigation to a bottom bar. Most of this lives in the Shell, because Albums and Artists
   share it.
2. **The track list.** The desktop song table, the compact list on tablet and mobile, and the TV
   track list.
3. **Library mode.** Playback mode (the playback bar is docked) and edit mode (the metadata
   editor is docked, double-click edits instead of plays).

This document comes from an audit of `MainLayout.tsx`, `Songs.tsx`, `TanstackSongTable.tsx`,
`createSongColumns.ts`, `TrackItem.tsx`, `AlphabetScrubber.tsx`, `TvHome.tsx`, `TvDetail.tsx`
and `TvTrackList.tsx`.

## 1. Command catalog

### Theme-invokable (usable as `Button command`)

| Command | Exists | Parameter | Host-driven states | Unavailable (button not rendered) | Notes |
|---------|--------|-----------|--------------------|-----------------------------------|-------|
| `wmm.ui.navigate` | yes | a page id declared in the layout | `selected` while that page is current. `badge` on the `sync` page button: the number of queued songs, hidden at 0 | never | Songs / Albums / Artists / Playlists / Sync buttons. The `selected` state and the badge are new for every page. |
| `wmm.ui.toggleEditMode` | **new** | none | `active` in edit mode. `disabled` on the `sync` page | on `tablet`, `mobile` and `tv` | Replaces the header Edit toggle. Entering edit mode pauses playback, as today. Library-wide: Songs, Albums, Artists and Playlists share the mode. |
| `wmm.ui.togglePanel` | **new** | the `id` of a `Panel collapsible="true"` in the same layout | `active` while the panel is open. `disabled` while the panel is suppressed ([4.3](#43-collapsible-panels)) | never | Replaces the sidebar toggle. Generic, so skins can collapse any panel. |
| `wmm.playback.playAll` | **new** | none | `disabled` while the page's `TrackList` is empty | when the page has no `TrackList` | Plays the page's current collection (search and filter applied) from the first song. The TV "Play" button. |

### Widget-internal (not theme-invokable in v1)

| Command | Payload | Invoked by |
|---------|---------|------------|
| `wmm.playback.playSong` | `{ songId }` | `TrackList` double-click / Enter / tap in playback mode |
| `wmm.playback.playCollection` | `{ songIds, startSongId? }` | `TrackList` context menu "Play" on a multi-selection |
| `wmm.playback.setCollectionSource` | `{ songIds }` | `TrackList`, whenever its visible songs change |
| `wmm.playback.addToQueue` | `{ songIds }` | `TrackList` context menu |
| `wmm.library.song.edit` | `{ songId }` | `TrackList` double-click in edit mode, context menu |
| `wmm.library.song.quickEdit` | `{ songIds }` | `TrackList` context menu |
| `wmm.sync.queueSongs` / `dequeueSongs` | `{ songIds }` | `TrackList` context menu, drag onto a `SyncQueue` |

Favorites, add to playlist, create playlist and the offline actions call core directly and have
no commands. They stay that way in v1, because the context menu is host-owned
([3.1](#31-tracklist)).

## 2. Host-driven states

| State | Source | Used by |
|-------|--------|---------|
| Current page | the router, published as `wmm.ui.viewChanged { view: pageId }` | `selected` on `wmm.ui.navigate` buttons |
| Library mode | `LibraryMode` (`playback` · `edit`), published as `wmm.ui.editorModeChanged { mode }` | `active` on `toggleEditMode`, the `libraryMode` attribute ([4.2](#42-library-mode)) |
| Panel open | host, per layout, remembered | `active` on `togglePanel` |
| Sync queue size | the sync queue store, events `wmm.sync.queued` / `dequeued` | `badge` on the `sync` navigate button |
| Selection | `wmm.ui.selectionChanged { songIds }` | nothing theme-visible in v1. `MetadataEditor` and the context menu use it. |

**Badges (new, general).** A host-driven `badge` is a count the host draws on a button's top end
corner, using the `accent` and `accentForeground` slots. A `ButtonStyle` can position it with
`badgeOffset` (Thickness) and hide it with `badge="none"`. Only commands that declare a badge in
a page catalog have one.

## 3. Widgets

### 3.1 TrackList

`TrackList` gains a `variant`, because each form factor shows songs differently today.

| Option | Variants | Values | Default |
|--------|----------|--------|---------|
| `variant` | | `table` · `albums` · `list` · `tv` | `table` on desktop, `list` on tablet and mobile, `tv` on tv |
| `columns` | table, albums | ordered subset of `title album artist albumArtist track disc genre year duration bitrate offline source` | `title album artist track genre year duration bitrate offline` |
| `sortBy` | table, albums | one of `columns` | `title` (table), `album` (albums) |
| `sortDirection` | table, albums | `ascending` · `descending` | `ascending` |
| `columnMenu` | table, albums | Boolean: header right-click menu with column checkboxes and Reset | `true` |
| `reorderColumns`, `resizeColumns` | table, albums | Boolean | `true` |
| `scrubber` | table, albums, list | Boolean: the alphabet scrubber along the end edge | `true` (table), `false` (list) |
| `fields` | list, tv | ordered subset of `artwork explicit artist album duration favorite` | list: `artwork explicit artist album duration favorite`; tv: `artwork artist album duration` |
| `alternateRows` | table, albums, tv | Boolean | `true` |
| `showHeader` | table, albums | Boolean | `true` |

Style slots: `rowText`, `headerText`, `alternateBrush` (as before), plus `playingText` (the
now-playing row; default `accent`). Min size: table 240×120, albums 360×160, list 200×120,
tv 480×200. One per page.

`albums` groups the rows by album while the table is sorted by Album, which is this variant's
default sort. Each album gets a header line with its artist, then a left column showing the cover,
album, album artist, genre and year beside that album's tracks, so the `album` column is redundant
there and is dropped if listed. Rows are ordered by album artist, then album, with the unknown
artist and album last, and each album's songs run in disc and track order. Sorting by any other
column shows a flat table instead, with an `album` column added first when the theme did not list
one, so every column sorts the way the `table` variant does. Clicking the Album header returns to
the grouped view.

`density` sets the row height: `compact` 28 px (today's table), `comfortable` 44 px (today's
list), and tv is always 72 px.

**Header sorting.** Clicking anywhere in a column header cell sorts by that column, not only its
label: the sort button fills the cell, so the whole header is the target, and the resize handle on
its end edge never sorts. Clicking the sorted column again reverses it.

**Column order.** `reorderColumns="true"` makes the headers draggable. Pressing a header and
moving more than 4 px sideways starts a drag: the dragged header dims, a 2 px rule marks the edge
the column lands on, and releasing moves it there. Alt+Left and Alt+Right on a focused header move
it one slot. The order persists per theme, page and variant beside the widths, and the column
menu's Reset returns to the theme's order. In the grouped albums form the album cell stays first
and is not reorderable.

**Album cell filters.** In the grouped albums form the album, album artist, genre and year beside
the cover are buttons that filter the page by that value: album, artist and genre through their
own selections, and year through a `year` selection that keeps the songs whose year matches. The
unknown-artist and unknown-album stand-ins stay plain text.

When the page's `LibraryBrowser` tree has a view selected (Artists, Albums, Genres or Playlists),
the `TrackList` shows that view's entries as a grid of cover tiles instead of songs: a square
cover that fills the tile's width, the entry's label and its song count, with the search box still narrowing the entries. A
double click or Enter on a tile opens it, which selects that artist, album, genre or playlist and
shows its songs. Library and Songs keep showing every song.

**Playlist tracks.** When the page's selection is a playlist, the `TrackList` starts in the
playlist's own order: no column is sorted, so the rows run in the order the playlist stores. A
header click sorts ascending, the next click descending, and the third click on the same column
returns to the playlist order. In that order each row carries a drag handle: dragging it shows a
2 px `primary` rule where the row lands, and dropping moves the song there through
`moveSongInPlaylist`. Alt+Up and Alt+Down on a focused row move it one slot. The row context menu
gains "Remove from playlist", and Delete removes the picked rows without asking. A playlist its
source keeps read-only shows no handle, no remove action and no Delete.

**Context menus.** Right-clicking a row opens the song menu for the songs that row holds: an
artist, album or genre value row and the Artists, Albums, Genres, Songs and Library view rows act
on every song they list, an album group's cover cell acts on that album's songs, and a `TrackList`
row acts on that row. Playlist rows, tiles and the `Playlist` widget open the playlist menu
instead: play, rename and delete, with rename and delete disabled for a read-only playlist and
delete asking first.

**Create playlist row.** The first row under Playlists is an action row, "New playlist", in
italics with a list-plus icon. It is never selected: clicking it or pressing Enter opens the
new-playlist dialog, and the playlist it creates becomes the page's selection.

**Host-owned behavior.** Not themable, listed so authors know what the widget does:

- **Columns** (table). `title` 240, `album` 240, `artist` 240, `track` 70, `duration` 90,
  `bitrate` 100, `offline` 80 px initial widths; the rest size to content. Every column sorts from
  anywhere in its header cell; clicking the sorted header again reverses it. Sort isn't persisted.
- **Column state.** `columns` is the theme's default set and order. The user's visibility, order
  and widths persist per theme, layout and page, and the column menu's Reset returns to the
  theme's default. Switching themes never carries column state across.
- **Title cell.** The now-playing glyph, the explicit badge and the favorite button. **Offline
  cell**: a check when stored locally, otherwise the download / remove button.
- **Selection.** Table: click, Ctrl/Cmd toggle, Shift range. List and tv: no multi-select; a tap
  or Select plays (playback mode) or edits (edit mode).
- **Context menu.** Desktop right-click, a bottom drawer on touch, not on TV. Groups: play,
  playlist, edit, offline, sync, as today.
- **States.** Loading (`common.loading`), empty (`library.noResults`), and the onboarding card
  with Add music source when there are no sources.
- **Virtualization.** Above 1000 rows.
- **Drag.** Rows drag onto a `Playlist` or `SyncQueue` on the same layout.

### 3.2 SearchBox

New options:

| Option | Values | Default |
|--------|--------|---------|
| `sourceFilter` | Boolean: the source filter menu inside the box | `true` on desktop, `false` elsewhere |
| `resultCount` | Boolean: "{0} results" after the input while a query is active | `true` on desktop, `false` elsewhere |
| `presentation` | `inline` · `button` (an icon button that opens a full-width search overlay, today's mobile search) | `inline` |

With `presentation="button"`, `display` and `style` work as on `Button`, so the box can sit in a
bottom navigation bar. The search filters the page's `TrackList` by title, album, artist and
genre, locally, as today. Still invalid in `tv.xml` (`E6095`).

### 3.3 CollectionSummary (new)

The TV list header: artwork, the page title, and "N songs · M min".

| Widget | Shows | Options | Style slots | Min size | Per page |
|--------|-------|---------|-------------|----------|----------|
| `CollectionSummary` | Summary of the page's `TrackList` collection. Title is the page's `titleKey`. | `fields`: ordered subset of `artwork title count duration` | `titleText`, `detailText` | 160×40 | 1 |

Artwork is a mosaic of the first four distinct album covers. Requires a `TrackList` on the same
page (`E6205`).

### 3.4 Shell widgets used by the library

`MetadataEditor`, `Playlist` and `SyncQueue` keep their contracts from
[03](../03-layouts.md#widgets). `MetadataEditor mode="full"` is today's docked editor;
`quick` is the quick-edit dialog content. With no songs selected, `full` renders nothing, so
a docked editor takes no space until a selection exists.

`Playlist` gains `editable` (Boolean, default `true`). With it the widget adds a new-playlist
button above the list, gives each row the playlist context menu, renames the focused row in place
on F2 and asks before deleting it on Delete. `editable="false"` leaves the list read-only, for a
layout that only browses playlists. Rows from a source that cannot write playlists stay
read-only whatever the attribute says.

## 4. Page and layout rules

### 4.1 The Songs page

```xml
<Page id="songs" role="library" titleKey="navigation.songs" default="true"> ... </Page>
```

The Songs page uses the existing `library` role. It is the "all songs" navigation intent, so no
`songs` role is added. Page ids in `wmm-default` match the app's
`wmm.ui.navigate` targets: `songs`, `albums`, `artists`, `playlists`, `sync`, plus `home` on TV.

### 4.2 Library mode

`libraryMode` (`playback` · `edit`) is a new attribute allowed on any element in the Shell or in
a page whose role is `library`, `artists`, `albums` or `playlists` (`E6201` elsewhere). The
element renders only in that mode and collapses otherwise, so the layout reflows as today when
the playback bar is replaced by the editor. It is a closed host state, not an expression.

### 4.3 Collapsible panels

`collapsible="true"` on a `Panel` makes it the target of `wmm.ui.togglePanel`, which needs the
panel's `id`. It starts closed; the host remembers it per layout. A collapsible panel is
**suppressed** (hidden, its toggle `disabled`) while the current page shows the same widget the
panel holds, e.g. a sidebar with `Playlist` on the Playlists page, as today. A collapsible panel
with `Tabs` is suppressed only when every tab would duplicate.

This promotes `id` from diagnostics-only to a command target for `Panel`. Ids stay optional
everywhere else.

### 4.4 Sidebar content

Today the Playlists and Sync header buttons either navigate or, while the sidebar is open, switch
the sidebar between playlists and sync. The spec expresses the sidebar as a collapsible `Panel`
holding a `Tabs` (Playlists, Sync), and the header buttons always navigate. This drops the dual
behavior of the header buttons.

## 5. Remote and keyboard input

| Input | Form factors | Action |
|-------|--------------|--------|
| Ctrl/Cmd + A | desktop | Select all rows in the table |
| Enter | desktop, tablet (hardware keyboard) | Play (playback mode) or edit (edit mode) the focused row |
| Ctrl/Cmd + E | desktop | `wmm.library.song.edit` for the selection |
| Ctrl/Cmd + Q | desktop | Add the current song to a playlist, as today |
| Escape | desktop | Clear the selection in edit mode |
| Type a letter | desktop | Jump to the first row whose sort key starts with it (the scrubber's keyboard path) |
| D-pad / Select | tv | Spatial focus between `CollectionSummary`, buttons and rows. Select on a row plays it. |

Playback keys are in [playback.md § 5](playback.md#5-remote-and-keyboard-input).

## 6. Events and the state driver

| Event | Payload | Published today | Drives |
|-------|---------|-----------------|--------|
| `wmm.ui.viewChanged` | `{ view: pageId }` | **no** (declared, no publisher or consumer) | `selected` on navigate buttons |
| `wmm.ui.editorModeChanged` | `{ mode: LibraryMode }` | **partly** (only Albums publishes `edit`; the route toggle doesn't) | `toggleEditMode`, `libraryMode` |
| `wmm.ui.selectionChanged` | `{ songIds }` | yes | `MetadataEditor` |
| `wmm.sync.queued` / `dequeued` | `{ songIds }` | yes | sync badge |
| `wmm.playback.started` | `{ songId }` | yes | `playingText` row |
| `wmm.playlists.imported` | | yes | `TrackList` refresh |

## 7. Resource keys

Existing keys used: `navigation.songs`, `navigation.albums`, `navigation.artists`,
`navigation.playlists`, `navigation.sync`, `navigation.library`, `navigation.sidebar`,
`navigation.sidebarBlocked`, `common.edit`, `common.loading`, `common.reset`,
`search.placeholder`, `search.resultCount`, `library.noResults`, `library.songCount`,
`library.unknownAlbum`, `common.unknownArtist`, `library.offline`, `playback.play`, and the
`metadata.*` column headers.

Keys to add (hard-coded literals today, mostly on TV):

| Key | English | Used by |
|-----|---------|---------|
| `navigation.home` | Home | TV navigation |
| `navigation.more` | More | TV home |
| `navigation.backToHome` | Back to home | TV empty state |
| `library.allSongs` | All songs | TV Songs page title |
| `library.nothingToBrowse` | Nothing to browse here | TV empty state |
| `library.album` / `library.artist` / `library.playlist` | Album / Artist / Playlist | TV detail kicker |
| `library.durationMinutes` | {0} min *(template)* | `CollectionSummary` |
| `library.showAllFrom` | Show all from {0} *(template)* | Album cell filter buttons |
| `metadata.bitrateValue` | {0} kbps *(template)* | Table bitrate cell |
| `navigation.editMode` | Edit mode | Accessible name of `toggleEditMode` while `active` |

## 8. Built-in layouts (`wmm-default`) for this page

### desktop.xml: Shell (library header, docks, sidebar) and Songs page

```xml
<Shell>
  <DockPanel>
    <Panel dock="top" style="@panel/header" padding="8 12">
      <Grid columns="auto 1* auto" columnGap="12">
        <Stack column="0" orientation="horizontal" gap="2" align="center">
          <Button command="wmm.ui.navigate" commandParameter="songs" labelKey="navigation.songs" display="label" style="@button/segment" />
          <Button command="wmm.ui.navigate" commandParameter="albums" labelKey="navigation.albums" display="label" style="@button/segment" />
          <Button command="wmm.ui.navigate" commandParameter="artists" labelKey="navigation.artists" display="label" style="@button/segment" />
        </Stack>
        <SearchBox column="1" scope="library" sourceFilter="true" resultCount="true" placeholderKey="search.placeholder" />
        <Stack column="2" orientation="horizontal" gap="8" align="center">
          <Button command="wmm.ui.toggleEditMode" labelKey="common.edit" icon="@icon/edit" style="@button/toggle" />
          <Button command="wmm.ui.navigate" commandParameter="playlists" labelKey="navigation.playlists" icon="@icon/playlists" style="@button/segment" />
          <Button command="wmm.ui.navigate" commandParameter="sync" labelKey="navigation.sync" icon="@icon/sync" style="@button/segment" />
          <Button command="wmm.ui.togglePanel" commandParameter="sidebar" labelKey="navigation.sidebar" icon="@icon/sidebar" display="icon" style="@button/toggle" />
        </Stack>
      </Grid>
    </Panel>
    <Panel dock="bottom" libraryMode="playback" style="@panel/playback-bar"> ... playback bar from playback.md § 8 ... </Panel>
    <MetadataEditor dock="bottom" libraryMode="edit" mode="full" height="320" panel="@panel/editor" />
    <Panel id="sidebar" dock="end" width="320" collapsible="true" style="@panel/sidebar">
      <Tabs strip="top" tabStyle="@button/tab">
        <Tab id="playlists" titleKey="navigation.playlists" icon="@icon/playlists"><Playlist artwork="true" /></Tab>
        <Tab id="sync" titleKey="navigation.sync" icon="@icon/sync"><SyncQueue summary="true" /></Tab>
      </Tabs>
    </Panel>
    <PageHost dock="fill" />
  </DockPanel>
</Shell>
```

```xml
<Page id="songs" role="library" titleKey="navigation.songs" default="true">
  <TrackList variant="table" density="compact" scrubber="true" />
</Page>
```

### tablet.xml and mobile.xml: Songs page

Navigation is the bottom bar in the Shell; the Shell chrome gets its own page spec. The page:

```xml
<Page id="songs" role="library" titleKey="navigation.songs" default="true">
  <TrackList variant="list" density="comfortable" fields="artwork explicit artist album duration favorite" />
</Page>
```

The mobile bottom bar's search entry:

```xml
<SearchBox presentation="button" scope="library" display="iconAndLabel" style="@button/bottom-nav" />
```

### tv.xml: All songs page

```xml
<Page id="songs" role="library" titleKey="library.allSongs">
  <DockPanel margin="32 64">
    <Stack dock="top" orientation="horizontal" gap="32" align="center" margin="0 0 24 0">
      <CollectionSummary fields="artwork title count duration" titleText="@text/tv-title" detailText="@text/tv-detail" />
      <Button command="wmm.playback.playAll" labelKey="playback.play" icon="@icon/play" style="@button/tv-play" />
    </Stack>
    <TrackList dock="fill" variant="tv" rowText="@text/tv-row" />
  </DockPanel>
</Page>
```

The TV home page (tiles) is out of scope here and gets its own page spec.

## 9. Validation added by this page

| Code | Severity | Rule |
|------|----------|------|
| `E6201` | error | `libraryMode` outside the Shell or a `library` / `artists` / `albums` / `playlists` page |
| `E6202` | error | A `TrackList` option used with a variant that doesn't support it ([3.1](#31-tracklist)) |
| `E6203` | error | `sortBy` not in `columns` (a column listed twice is `E4004`) |
| `E6204` | error | `wmm.ui.togglePanel` whose parameter isn't the `id` of a `Panel collapsible="true"` in the same layout |
| `E6205` | error | `CollectionSummary` or a `wmm.playback.playAll` button on a page with no `TrackList` |
| `E6206` | error | `sourceFilter` or `resultCount` on a `SearchBox` with `scope="sync"` |
| `W6207` | warning | A `Panel collapsible="true"` with no reachable `togglePanel` button (it can never open) |
| `W6208` | warning | `TrackList variant="table"` or `variant="albums"` in `mobile.xml` or `tv.xml` (needs a pointer), or `variant="tv"` outside `tv.xml` |
| `W6209` | warning | A `toggleEditMode` button but no `MetadataEditor` with `libraryMode="edit"` |
| `W6210` | warning | A `Panel resizable="true"` docked to neither `start` nor `end` (nothing to drag) |

## 10. App changes this page depends on (to do)

1. **`wmm.library.song.quickEdit` has no handler.** The context menu publishes it and nothing
   happens. Register it to open the quick-edit dialog.
2. **"Play" on a multi-selection plays one song.** Send `wmm.playback.playCollection` with the
   selected ids and the clicked row as `startSongId`.
3. **New commands**: `wmm.ui.toggleEditMode`, `wmm.ui.togglePanel`, `wmm.playback.playAll`, added
   to the taxonomy and `WMM_THEME_COMMANDS`.
4. **`LibraryMode` const object** (`playback` · `edit`) in `src/models`, replacing the
   `"song" | "edit"` payload of `wmm.ui.editorModeChanged`. Publish it on every mode change.
5. **Publish `wmm.ui.viewChanged { view }`** on every page change.
6. **`home` in the `wmm.ui.navigate` domain** on TV ([playback.md § 8](playback.md#8-built-in-layouts-wmm-default-for-this-page)
   already uses it).
7. **Column state storage** keyed by theme, layout and page; migrate `wmm.songTable.columns` to
   the built-in theme's key.
8. **Resource keys** in [section 7](#7-resource-keys), in en-US and es-MX.
9. **Icon** `sidebar` added to the v1.0 icon set.

## 11. Review decisions

Approved:

1. **Role**: the Songs page uses `library`; no `songs` role ([4.1](#41-the-songs-page)).
2. **`libraryMode` attribute** for the playback bar ↔ editor swap ([4.2](#42-library-mode)).
3. **`togglePanel` and collapsible panels** for the sidebar, which makes `Panel id` a command
   target ([4.3](#43-collapsible-panels)).
4. **Header buttons always navigate**; the sidebar switches content through its own tabs
   ([4.4](#44-sidebar-content)).
5. **New `playAll` command and `CollectionSummary` widget** for the TV header.
6. **Badges** as a general host-driven decoration ([section 2](#2-host-driven-states)).

## 12. First pipeline target

The Songs page is the first page the core pipeline compiles: parse → validate → compile to the
Theme IR, tested in vitest against the `wmm-default` desktop Songs layout above. The first slice
covers the root, `Shell`, `Page`, `PageHost`, the five primitives, `Button`, and the widgets this
page uses, with the grammar (`4xxx`) and this page's `62xx` rules. Rendering follows once the IR
is stable.

The parser is built on `saxes`, a streaming XML parser with no browser dependency, so the same
code runs in the app, in workers and in vitest.
