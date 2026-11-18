# Page spec · Playback

Status: **Draft for review** · Applies to spec `1.0`

The playback surface has two parts:

1. **The transport region.** The persistent playback controls, usually in the Shell. Today that is
   the desktop playback bar, the compact mini-player (tablet, mobile) and the TV Now Playing
   indicator in the top navigation.
2. **The Now Playing page.** The page with the `nowPlaying` role. Today that is the full-screen Now
   Playing view with the backdrop, artwork, queue, lyrics and visualizer.

This document defines every command, host-driven state, widget, page rule and input binding for
both parts, on all four form factors. It also lists the app changes the spec depends on, which
came from an audit of the current code (`PlayerControls.tsx`, `NowPlayingView.tsx`,
`TvPlaybackControls.tsx`, `PlaybackProvider.tsx`, `spatialNavigation.ts`).

## 1. Command catalog

### Theme-invokable (usable as `Button command`)

| Command | Exists | Parameter | Host-driven states | Unavailable (button not rendered) | Notes |
|---------|--------|-----------|--------------------|-----------------------------------|-------|
| `wmm.playback.playpause` | yes | none | `active` while audio is playing (also while buffering a track the user started) | never | With nothing loaded, starts the current collection, as today. |
| `wmm.playback.next` | yes | none | `disabled` when no track is loaded | never | |
| `wmm.playback.prev` | yes | none | `disabled` when no track is loaded | never | Follows the existing restart-then-previous behavior. |
| `wmm.playback.stop` | yes | none | `disabled` when no track is loaded | never | No built-in layout uses it today. Classic skins expect it. |
| `wmm.playback.seekBy` | yes | `deltaSeconds`: whole number, −300…300, not 0 | `disabled` when no track is loaded or duration is unknown | never | e.g. `commandParameter="-10"` for a rewind button. |
| `wmm.playback.toggleShuffle` | yes | none | `active` when shuffle is on (value `on`) | never | |
| `wmm.playback.toggleRepeat` | yes | none | `active` when repeat is not off. Values `all`, `one` | never | Cycle is off → one → all → off, as today. |
| `wmm.playback.toggleMute` | yes | none | `active` while muted | never | Mute is owned by the playback provider, so every mute button agrees. Muting never changes the stored volume; setting a volume above 0 unmutes. |
| `wmm.ui.openNowPlaying` | yes | none | `selected` while the Now Playing page is visible | never | Opens the `nowPlaying`-role page, or the host's built-in Now Playing view if the layout has none. |
| `wmm.ui.closeNowPlaying` | yes | none | none | when the Now Playing page isn't visible | Returns to the page underneath (overlay) or the previous page. |
| `wmm.ui.toggleFullscreen` | yes | none | `active` while fullscreen; `disabled` unless the Now Playing page is showing, except while fullscreen so it can exit | where the Fullscreen API is missing, in hosted TV shells, and on `mobile` | Replaces the view-local fullscreen toggle and the `f` key handler. |
| `wmm.ui.toggleDarkRoom` | yes | none | `active` while dark room is on | when the Now Playing page isn't visible | Replaces the view-local dark room toggle. Effect: see [4.3](#43-dark-room). |
| `wmm.visualizer.openSettings` | yes | none | `disabled` when no visualizer is active or it has no settings | when the layout has no `Visualizer` widget | Opens the host's settings dialog for the active plugin. |

**Unavailable vs disabled.** This is a new, general rule for all commands, not just playback.
A command can be **unavailable** on a platform or in a context, and then the host doesn't render
its buttons at all (layout collapses around them). A **disabled** button is rendered with its
`disabled` style. A theme can't make an unavailable command visible.

### Widget-internal (not theme-invokable in v1)

These need runtime values a v1 theme can't supply. The widgets in [section 3](#3-widgets) invoke them.

| Command | Payload | Invoked by |
|---------|---------|------------|
| `wmm.playback.seek` | `{ positionSeconds }` in seconds, clamped to the track | `SeekBar` |
| `wmm.playback.clearQueue` | none | `PlayQueue` Clear button only. Not theme-invokable: a standalone button would discard a queue the user can't see, and it is the only playback command that discards user state. |
| `wmm.playback.setVolume` | `{ volume }` 0–1 | `VolumeControl` |
| `wmm.playback.playSong` | `{ songId }` | `PlayQueue` rows |
| `wmm.playback.removeFromQueue` | `{ songId }` | `PlayQueue` rows |
| `wmm.playback.playQueue`, `playCollection`, `setCollectionSource`, `addToQueue` | song ids | Library widgets (other pages) and context menus |
| `wmm.visualizer.select` | `{ pluginId }` | `Visualizer` selector |

## 2. Host-driven states (amendment to 02)

v1 button states stay static and single-valued. This page needs two refinements, now in
[02 · Button styles](../02-theme-xml.md#button-styles):

1. **State values.** Some commands have a multi-valued state. `<State name="active">` matches any
   active value, and `<State name="active" value="one">` matches only that value. A valued state
   beats an unvalued one. The value domain belongs to the command: `toggleRepeat` → `all`, `one`;
   `toggleShuffle` → `on`. If the value isn't in the domain of the command the button invokes, the
   validator reports an error at the button (`E6104`).
2. **Icon swaps.** Host icons with built-in state faces: `playPause` (play ↔ pause on `active`),
   `repeat` (repeat ↔ repeat-one on `active=one`), `mute` (volume ↔ muted on `active`),
   `fullscreen` (enter ↔ exit on `active`). Image-skinned buttons do this with `<State image>`.

```xml
<ButtonStyle id="repeat" image="@image/repeat-off">
  <State name="active" image="@image/repeat-all" />
  <State name="active" value="one" image="@image/repeat-one" />
</ButtonStyle>
```

## 3. Widgets

The v1 draft had a single `NowPlaying` widget. A classic skin needs to place the seek bar, the
time and the volume independently, so the playback family is split into small widgets. The
composite `NowPlaying` stays as a shortcut for simple themes.

Shared attributes are the same as for every widget (`panel`, `density`, layout attributes).
Text style slots take `@text/...`, and slider slots take `@slider/...` (new style kind, below).

| Widget | Shows | Options | Style slots | Min size | Per page |
|--------|-------|---------|-------------|----------|----------|
| `Artwork` | Current track's cover. A disc icon when there's none. | `fit` (`cover` · `contain`), `action` (`none` · `openNowPlaying`), `cornerRadius` | none | 24×24 | unlimited |
| `TrackInfo` | Title and details of the current track. Shows `playback.nothingPlaying` when idle, with any trailing time field still drawn as `--:--` (`--:-- / --:--` for `elapsedAndTotal`) so the time slot never moves. | `fields`: ordered subset of `title explicit favorite artist album albumArtist genre year track disc bitrate elapsed total remaining elapsedAndTotal`. `trailing`: the same values, drawn right after the title (on the title line when `stacked`). A `hAlign="center"` centers `stacked` text. `arrangement` (`stacked` · `inline`) | `titleText`, `detailText` | 80×16 | unlimited |
| `PlaybackTime` | A time readout. Shows `--:--` while the duration is unknown. | `format` (`elapsed` · `total` · `remaining` · `elapsedAndTotal`) | `text` | 32×12 | unlimited |
| `SeekBar` | Seek slider with buffering indicator. Seeking sends `wmm.playback.seek`. | `variant` (`bar` · `edge`: a thin rule along the parent's top edge with an enlarged touch hit area), `buffering` (Boolean, default `true`, never shown for offline tracks) | `slider` | bar 80×16 · edge 80×2 | 2 |
| `VolumeControl` | Volume slider, 0–1 in 0.01 steps, plus an optional mute button. | `orientation` (`horizontal` · `vertical`), `muteButton` (Boolean) | `slider`, `button` (`@button/`) | 80×16 (vertical 16×80) | 2 |
| `PlayQueue` | The play queue (current and upcoming). When the queue is empty and shuffle is off, the next song in the current collection under `playback.upNext`. | `presentation` (`inline` · `popover`: a button that opens the queue in a host popover, disabled when empty), `artwork` (Boolean, otherwise track numbers), `clearButton` (Boolean), `upNext` (Boolean) | `rowText`, `detailText`, `headerText`, `button` (popover trigger) | inline 160×120 · popover 28×28 | 1 |
| `Lyrics` | The current song's lyrics, or `playback.noLyrics`. | `align` (`start` · `center`) | `text` | 160×80 | 1 |
| `Visualizer` | The active visualizer plugin. `selector` and `settingsButton` add the plugin picker and its settings, placed at the start of the tab strip when the widget sits in a `Tabs` panel, otherwise at the top start of the frame. | `selector` (Boolean), `settingsButton` (Boolean), `trackInfo` (Boolean: a title and artist overlay), `fallback` (`artwork` · `none`) | `titleText`, `detailText` | 120×80 | **1 per layout** |
| `Backdrop` | The animated, artwork-derived background (seeded gradient, dots, circles, notes). Static when reduced motion is on. | `source` (`artwork` · `palette`: derived from `@slot/accent`) | none | none | 1 |
| `NowPlaying` | Composite shortcut. Renders the built-in arrangement. | `variant` (`bar` · `compact` · `indicator` · `full`), `artwork`, `transport`, `seek`, `volume`, `queue` (Booleans; ignored by `indicator`) | `titleText`, `detailText`, `transportButton` (`@button/`), `slider` | bar 320×56 · compact 240×56 · indicator 160×40 · full 320×320 | 1 |

`NowPlaying variant="indicator"` is today's TV navigation chip: small artwork, title, artist, and
three bars that animate while playing and dim while paused. It is focusable and invokes
`wmm.ui.openNowPlaying`. It renders nothing while no track is loaded.

`favorite` inside `TrackInfo` toggles the current song's favorite. It is widget-internal because
it needs the current song id, and it uses the favorite logic the app already has.

**Cardinality.** Widgets inside every tab of a `Tabs` count toward the page. For an `overlay` page,
the Shell is hidden, so Shell widgets don't count toward that page.

### Slider styles (new style kind, amendment to 02)

`SeekBar` and `VolumeControl` share one style kind, declared in a new `<SliderStyles>` section
after `<ButtonStyles>` in `theme.xml`. It is referenced as `@slider/id`.

```xml
<SliderStyles>
  <SliderStyle id="seek" thickness="4" cornerRadius="2"
               track="@slot/progressTrack" fill="@slot/progressFill" buffer="#ffffff33"
               thumb="round" thumbSize="12">
    <State name="hover" thumbSize="14" />
    <State name="focused" border="@slot/ring" />
    <State name="disabled" opacity="0.4" />
  </SliderStyle>
  <SliderStyle id="classic-seek" thickness="6" track="@brush/groove" fill="@brush/chrome-gloss"
               thumb="image" thumbImage="@image/seek-thumb" />
</SliderStyles>
```

Properties: `basedOn`, `thickness` (2–24), `cornerRadius`, `track`, `fill`, `buffer` (Brush),
`border` (Color), `thumb` (`none` · `round` · `image`), `thumbImage` (`@image/`, required when
`thumb="image"`), `thumbSize` (8–48), `opacity`. States: `hover` · `pressed` · `focused` ·
`disabled`. The `edge` variant of `SeekBar` ignores `thumb` until pressed. Without a slot value,
the host's default slider style derived from the palette applies.

## 4. The Now Playing page

```xml
<Page id="now-playing" role="nowPlaying" titleKey="playback.nowPlaying"
      presentation="overlay" openOnPlay="false"> … </Page>
```

| Attribute | Rules |
|-----------|-------|
| `role="nowPlaying"` | At most one page per layout. Without one, `wmm.ui.openNowPlaying` opens the host's built-in Now Playing view styled with the theme's tokens. |
| `presentation` | `overlay` (covers the whole window, the Shell stays mounted but hidden) or `page` (renders in the `PageHost`, for skins with a permanent Now Playing tab). |
| `openOnPlay` | Boolean. Open this page automatically when playback starts (`wmm.playback.started`). Default `true` on `tv` (current behavior) and `false` elsewhere. |

### 4.1 Idle hide

`idleHide="true"` is allowed on any element inside the Now Playing page (`E6101` elsewhere). The
host fades marked elements out and back in. The fade is host motion, not a theme animation, and
it is instant under reduced motion. When it applies depends on the form factor and matches today:

| Form factor | Rule |
|-------------|------|
| `desktop` | While playing, after 3 s without pointer, key or touch input. Any input shows them again. |
| `tv` | Always (playing or paused), after 3 s without remote input. The first key press only wakes the controls and isn't passed to the focused element. |
| `tablet`, `mobile` | No timer. Tapping an empty area of the page toggles them. |

Focus never moves to a hidden element. On TV, hiding keeps the current focus target, and the
waking key press reveals it.

### 4.2 Leaving the page

- `wmm.ui.closeNowPlaying` buttons, Back on TV and Escape on desktop all leave the page.
- A `tablet` or `mobile` layout whose `overlay` Now Playing page has no reachable
  `wmm.ui.closeNowPlaying` button is an error (`E6107`), because touch devices have no reliable
  back key. On desktop it is a warning (`W6107`), since Escape works.

### 4.3 Dark room

While dark room is on, the host hides the page's `Backdrop` and `Artwork` widgets and dims the
other non-`Visualizer` widgets to 40% opacity. This is fixed host behavior in v1. Visual state
groups (reserved) will let themes define their own dark room appearance later.

### 4.4 Tabs (new primitive)

Today's view switches between Queue, Lyrics and Visualizer. Pages are too coarse for that, so
this spec proposes a fifth layout primitive, **`Tabs`**. It is generic (the library page needs it
too) and holds no app data. *Open for review: it extends the primitive list you specified.*

```xml
<Tabs strip="top" stripAlign="center" tabStyle="@button/tab">
  <Tab id="queue" titleKey="playback.queue" icon="@icon/queue"> … one child … </Tab>
  <Tab id="lyrics" titleKey="playback.lyrics" icon="@icon/lyrics"> … </Tab>
  <Tab id="visualizer" titleKey="visualizer.title" icon="@icon/visualizer"> … </Tab>
  <TabStripEnd> … one child, rendered at the end of the strip … </TabStripEnd>
</Tabs>
```

`strip`: `top` · `bottom` · `start` · `end`. `stripAlign`: `start` · `center` · `end`. `tabStyle`:
`@button/...`, where the host applies `selected` to the current tab. `display` is the same as on
Button. 2–8 tabs. The host remembers the selected tab per layout. Tab panels that aren't shown
stay unmounted, except a `Visualizer`, which is paused instead so its GPU context survives.
`hideInFullscreen` (Boolean, default `false`) hides the strip the same way as a panel, while the
selected tab's content stays, and returns on pointer or key activity.

## 5. Remote and keyboard input

Host-owned and not themable. These are listed so authors know what the user can always do.

| Input | Form factors | Action |
|-------|--------------|--------|
| Space | desktop, tablet (hardware keyboard) | `wmm.playback.playpause` |
| Ctrl/Cmd + → / ← | desktop, tablet | `wmm.playback.next` / `prev` |
| `f` | desktop, on the Now Playing page | `wmm.ui.toggleFullscreen` |
| Escape | desktop | `wmm.ui.closeNowPlaying` when on the Now Playing page |
| MediaPlayPause | all | `wmm.playback.playpause` |
| MediaTrackNext / MediaTrackPrevious | all | `wmm.playback.next` / `prev` |
| MediaFastForward, MediaSkipForward | all | `wmm.playback.seekBy` +10 |
| MediaRewind, MediaSkipBackward | all | `wmm.playback.seekBy` −10 |
| Back, Backspace, BrowserBack | tv | `wmm.ui.closeNowPlaying` on the Now Playing page, otherwise back |
| D-pad arrows / Select | tv | Spatial focus and activate. On a focused `SeekBar` or `VolumeControl`, ← / → adjust the value (5% per press). |

## 6. Events and the state driver

The host's state driver turns events into the host-driven states above. These events also form
the contract that future bindings and event triggers will use, so they must be published
reliably before the spec is frozen.

| Event | Payload | Published today | Drives |
|-------|---------|-----------------|--------|
| `wmm.playback.started` | `{ songId, positionSeconds? }` | yes | `active` on playpause, `openOnPlay`, indicator animation |
| `wmm.playback.paused` | `{ songId }` | yes | `active` off on playpause, indicator dimming |
| `wmm.playback.completed` | `{ songId }` | yes | nothing in v1 |
| `wmm.playback.queueChanged` | `{ songIds }` | yes | `PlayQueue`, popover trigger |
| `wmm.playback.shuffleChanged` | `{ enabled }` | yes | `active` on toggleShuffle |
| `wmm.playback.repeatChanged` | `{ state: RepeatState }` (`off` · `one` · `all`) | yes | `active` and its value on toggleRepeat |
| `wmm.playback.volumeChanged` | `{ volume }` | yes | `VolumeControl` |
| `wmm.playback.positionChanged` | `{ songId, positionSeconds }` | yes, once per second while playing and after each seek | nothing in v1, since `SeekBar` polls for smoothness. Future bindings. |
| `wmm.playback.muteChanged` | `{ muted }` | yes | `active` on toggleMute |
| `wmm.ui.fullscreenChanged` | `{ fullscreen }` | yes | `active` on toggleFullscreen |
| `wmm.ui.darkRoomChanged` | `{ enabled }` | yes | `active` on toggleDarkRoom |
| `wmm.ui.nowPlayingChanged` | `{ open }` | yes | `selected` on openNowPlaying, availability of closeNowPlaying |

## 7. Resource keys

Keys already used by the playback surface: `playback.playPause`, `playback.play`,
`playback.pause`, `playback.next`, `playback.previous`, `playback.nextTrack`,
`playback.previousTrack`, `playback.stop`, `playback.shuffle`, `playback.repeat`,
`playback.seek`, `playback.volume`, `playback.mute`, `playback.unmute`, `playback.buffering`,
`playback.nothingPlaying`, `playback.nowPlaying`, `playback.openNowPlaying`,
`playback.closeNowPlaying`, `playback.queue`, `playback.upNext`, `visualizer.title`,
`visualizer.settings`.

Keys added for this page (all hard-coded literals in the playback views are now replaced):

| Key | English | Used by |
|-----|---------|---------|
| `playback.lyrics` | Lyrics | Now Playing tab label |
| `playback.hidePanel` | Hide {0} *(template: tab label)* | Tab tooltip while the tab is open |
| `playback.noLyrics` | No lyrics for this song. | Lyrics empty state |
| `playback.queueHeading` | Queue — {0} song / songs *(plural: count)* | Now Playing queue heading |
| `playback.playlist` | Playlist | Queue popover trigger |
| `playback.playlistHeading` | Playlist - {0} song / songs *(plural: count)* | Queue popover heading |
| `playback.darkRoom` | Dark room | toolbar button |
| `playback.lightsOn` | Turn on the lights | toolbar button (active) |
| `common.fullScreen` | Full screen | Now Playing and visualizer fullscreen buttons |
| `visualizer.noVisualizerInstalled` | No visualizer installed. | Visualizer host empty state |
| `visualizer.installVisualizer` | Install a visualizer | Visualizer host empty state |
| `visualizer.loadingVisualizer` | Loading visualizer… | Visualizer host |

The queue "Clear" button reuses `common.clear` and exit full screen reuses `common.exitFullScreen`.

Still to add with the theme runtime (no current view needs them):

| Key | English | Purpose |
|-----|---------|---------|
| `playback.repeatOff` / `repeatAll` / `repeatOne` | Repeat off / Repeat all / Repeat one | Accessible names for the repeat states |
| `playback.seekForward` / `seekBack` | Skip forward / Skip back | Labels for `seekBy` buttons |

`TvNowPlayingIndicator` uses the existing `playback.openNowPlaying`.

**Accessible names follow state.** For a button with a state-bearing command, the host announces
the state-specific label (e.g. `playback.pause` while `active` on playpause, `playback.repeatOne`
for `active=one`) instead of `labelKey`. The theme's `labelKey` is used only for the visible label.

## 8. Built-in layouts (`wmm-default`) for this page

These reproduce today's app in the spec, to prove it can express it. Style references assume the
built-in `theme.xml`.

### desktop.xml: bar (in the Shell) and Now Playing

```xml
<Panel dock="bottom" style="@panel/playback-bar">
  <Grid columns="1* auto 1*" columnGap="16">
    <Stack column="0" orientation="horizontal" gap="12" align="center">
      <Artwork width="56" height="56" action="openNowPlaying" />
      <TrackInfo fields="title explicit artist favorite" />
    </Stack>
    <Stack column="1" gap="4" align="center">
      <Stack orientation="horizontal" gap="8" align="center">
        <Button command="wmm.playback.toggleShuffle" labelKey="playback.shuffle" icon="@icon/shuffle" display="icon" />
        <Button command="wmm.playback.prev" labelKey="playback.previous" icon="@icon/prev" display="icon" />
        <Button command="wmm.playback.playpause" labelKey="playback.playPause" icon="@icon/playPause" display="icon" style="@button/play" />
        <Button command="wmm.playback.next" labelKey="playback.next" icon="@icon/next" display="icon" />
        <Button command="wmm.playback.toggleRepeat" labelKey="playback.repeat" icon="@icon/repeat" display="icon" />
      </Stack>
      <Stack orientation="horizontal" gap="8" align="center" width="480">
        <PlaybackTime format="elapsed" />
        <SeekBar grow="1" slider="@slider/seek" />
        <PlaybackTime format="total" />
      </Stack>
    </Stack>
    <Stack column="2" orientation="horizontal" gap="8" align="center" justify="end">
      <PlayQueue presentation="popover" artwork="true" clearButton="true" />
      <VolumeControl width="140" muteButton="true" slider="@slider/volume" />
    </Stack>
  </Grid>
</Panel>
```

```xml
<Page id="now-playing" role="nowPlaying" titleKey="playback.nowPlaying" presentation="overlay">
  <Grid rows="1* auto">
    <Backdrop row="0" rowSpan="2" source="artwork" />
    <Tabs row="0" strip="top" stripAlign="center" tabStyle="@button/tab" margin="16">
      <Tab id="queue" titleKey="playback.queue" icon="@icon/queue">
        <Grid columns="1* 1*" columnGap="32">
          <Stack column="0" gap="16" align="center" vAlign="center">
            <Artwork width="360" height="360" cornerRadius="12" />
            <TrackInfo fields="title explicit favorite artist album" titleText="@text/np-title" />
          </Stack>
          <PlayQueue column="1" artwork="true" clearButton="true" upNext="true" />
        </Grid>
      </Tab>
      <Tab id="lyrics" titleKey="playback.lyrics" icon="@icon/lyrics">
        <DockPanel>
          <Stack dock="top" orientation="horizontal" gap="12" align="center">
            <Artwork width="24" height="24" />
            <TrackInfo fields="title artist" arrangement="inline" />
          </Stack>
          <Lyrics dock="fill" align="center" />
        </DockPanel>
      </Tab>
      <Tab id="visualizer" titleKey="visualizer.title" icon="@icon/visualizer">
        <Visualizer selector="true" settingsButton="true" trackInfo="true" fallback="artwork" />
      </Tab>
      <TabStripEnd>
        <Stack orientation="horizontal" gap="4" idleHide="true">
          <Button command="wmm.ui.toggleDarkRoom" labelKey="playback.darkRoom" icon="@icon/darkRoom" display="icon" />
          <Button command="wmm.ui.toggleFullscreen" labelKey="common.fullScreen" icon="@icon/fullscreen" display="icon" />
          <Button command="wmm.ui.closeNowPlaying" labelKey="playback.closeNowPlaying" icon="@icon/close" display="icon" />
        </Stack>
      </TabStripEnd>
    </Tabs>
    <NowPlaying row="1" variant="bar" artwork="false" idleHide="true" />
  </Grid>
</Page>
```

Today the desktop bar stays visible under the Now Playing view. In the spec the overlay hides the
Shell, so the page carries its own bar (`NowPlaying variant="bar"` without artwork, matching how
today's bar hides its track info while the view is open). Templates (reserved) will remove this
duplication.

### mobile.xml and tablet.xml: mini-player and Now Playing

The current app uses the same compact player on both, so the built-in `tablet.xml` and
`mobile.xml` share this markup. The tablet Shell puts the navigation beside it.

```xml
<Panel dock="bottom" style="@panel/mini-player" padding="0 8 0 8">
  <Grid rows="auto auto">
    <SeekBar row="0" variant="edge" slider="@slider/seek" />
    <Stack row="1" orientation="horizontal" gap="12" align="center" margin="8 0">
      <Artwork width="44" height="44" action="openNowPlaying" />
      <TrackInfo grow="1" fields="title explicit artist album favorite" />
      <Button command="wmm.playback.playpause" labelKey="playback.playPause" icon="@icon/playPause" display="icon" style="@button/play-large" />
    </Stack>
  </Grid>
</Panel>
```

```xml
<Page id="now-playing" role="nowPlaying" titleKey="playback.nowPlaying" presentation="overlay">
  <Grid rows="1* auto">
    <Backdrop row="0" rowSpan="2" source="artwork" />
    <Tabs row="0" strip="top" tabStyle="@button/tab" display="icon">
      <Tab id="queue" titleKey="playback.queue" icon="@icon/queue">
        <Stack gap="16" align="center" overflow="scroll">
          <Artwork width="280" height="280" cornerRadius="12" />
          <TrackInfo fields="title explicit favorite artist album" titleText="@text/np-title" />
          <PlayQueue artwork="true" clearButton="true" upNext="true" />
        </Stack>
      </Tab>
      <Tab id="lyrics" titleKey="playback.lyrics" icon="@icon/lyrics">
        <Lyrics />
      </Tab>
      <Tab id="visualizer" titleKey="visualizer.title" icon="@icon/visualizer">
        <Visualizer selector="true" settingsButton="true" trackInfo="true" />
      </Tab>
      <TabStripEnd>
        <Stack orientation="horizontal" gap="4" idleHide="true">
          <Button command="wmm.ui.toggleDarkRoom" labelKey="playback.darkRoom" icon="@icon/darkRoom" display="icon" style="@button/touch" />
          <Button command="wmm.ui.closeNowPlaying" labelKey="playback.closeNowPlaying" icon="@icon/close" display="icon" style="@button/touch" />
        </Stack>
      </TabStripEnd>
    </Tabs>
    <Stack row="1" gap="8" idleHide="true" margin="16">
      <Stack orientation="horizontal" gap="8" align="center">
        <PlaybackTime format="elapsed" />
        <SeekBar grow="1" slider="@slider/seek" />
        <PlaybackTime format="total" />
      </Stack>
      <Stack orientation="horizontal" justify="spaceBetween" align="center">
        <Button command="wmm.playback.toggleShuffle" labelKey="playback.shuffle" icon="@icon/shuffle" display="icon" style="@button/touch" />
        <Button command="wmm.playback.prev" labelKey="playback.previous" icon="@icon/prev" display="icon" style="@button/touch" />
        <Button command="wmm.playback.playpause" labelKey="playback.playPause" icon="@icon/playPause" display="icon" style="@button/play-large" />
        <Button command="wmm.playback.next" labelKey="playback.next" icon="@icon/next" display="icon" style="@button/touch" />
        <Button command="wmm.playback.toggleRepeat" labelKey="playback.repeat" icon="@icon/repeat" display="icon" style="@button/touch" />
      </Stack>
    </Stack>
  </Grid>
</Page>
```

`wmm.ui.toggleFullscreen` is unavailable on `mobile`, so it isn't listed here. On `tablet` the
host would render it if listed. The built-in tablet layout omits it to match today.

### tv.xml: indicator (in the Shell) and Now Playing

```xml
<Stack orientation="horizontal" gap="16" align="center">
  <Button command="wmm.ui.navigate" commandParameter="home" labelKey="navigation.library" icon="@icon/library" style="@button/tv-nav" />
  <NowPlaying variant="indicator" />
</Stack>
```

```xml
<Page id="now-playing" role="nowPlaying" titleKey="playback.nowPlaying" presentation="overlay" openOnPlay="true">
  <Grid rows="1* auto">
    <Backdrop row="0" rowSpan="2" source="artwork" />
    <Tabs row="0" strip="top" stripAlign="center" tabStyle="@button/tv-tab">
      <Tab id="queue" titleKey="playback.queue" icon="@icon/queue">
        <Grid columns="1* 1*" columnGap="48">
          <Stack column="0" gap="24" align="center" vAlign="center">
            <Artwork width="420" height="420" cornerRadius="16" />
            <TrackInfo fields="title artist album" titleText="@text/tv-title" detailText="@text/tv-detail" />
          </Stack>
          <PlayQueue column="1" artwork="true" upNext="true" rowText="@text/tv-row" />
        </Grid>
      </Tab>
      <Tab id="lyrics" titleKey="playback.lyrics" icon="@icon/lyrics">
        <Lyrics align="center" text="@text/tv-lyrics" />
      </Tab>
      <Tab id="visualizer" titleKey="visualizer.title" icon="@icon/visualizer">
        <Visualizer selector="true" trackInfo="true" titleText="@text/tv-title" />
      </Tab>
    </Tabs>
    <Stack row="1" gap="16" idleHide="true" margin="32 64">
      <Stack orientation="horizontal" gap="16" align="center">
        <PlaybackTime format="elapsed" text="@text/tv-detail" />
        <SeekBar grow="1" slider="@slider/tv-seek" />
        <PlaybackTime format="total" text="@text/tv-detail" />
      </Stack>
      <Stack orientation="horizontal" gap="24" justify="center">
        <Button command="wmm.playback.prev" labelKey="playback.previousTrack" icon="@icon/prev" display="icon" style="@button/tv-transport" />
        <Button command="wmm.playback.playpause" labelKey="playback.playPause" icon="@icon/playPause" display="icon" style="@button/tv-play" />
        <Button command="wmm.playback.next" labelKey="playback.nextTrack" icon="@icon/next" display="icon" style="@button/tv-transport" />
      </Stack>
    </Stack>
  </Grid>
</Page>
```

On TV, Back leaves the page, so no close button is needed. Volume is left to the TV's remote,
which is why there's no `VolumeControl`.

## 9. Validation added by this page

| Code | Severity | Rule |
|------|----------|------|
| `E6101` | error | `idleHide` outside the `nowPlaying` page |
| `E6102` | error | `presentation="overlay"` on a page whose role isn't `nowPlaying` |
| `E6103` | error | `openOnPlay` outside the `nowPlaying` page |
| `E6104` | error | A `<State name="active" value>` that isn't in the state domain of the command a button using the style invokes |
| `E6105` | error | `commandParameter` outside the command's domain (e.g. `seekBy` of 0 or 600) |
| `E6106` | error | More than one `nowPlaying` page, or a `Tabs` with fewer than 2 or more than 8 tabs |
| `E6107` / `W6107` | error (tablet, mobile) / warning (desktop) | `overlay` Now Playing page with no reachable `wmm.ui.closeNowPlaying` button |
| `W6108` | warning | `VolumeControl` in `tv.xml` (the TV remote controls volume) |
| `W6109` | warning | A Now Playing page with no `wmm.playback.playpause` button and no `NowPlaying` with `transport="true"`, counting the Shell's controls unless the page is an `overlay` |
| `W6110` | warning | `SeekBar variant="edge"` whose parent isn't a `Panel` or `Grid` row (the edge needs a container top) |

## 10. App changes this page depended on (done)

These came from the code audit and have landed:

1. **`wmm.playback.seek` takes seconds.** Callers convert slider positions; the provider clamps to the track. `seekBy` and the media-session seek use seconds too.
2. **Declared events are published**: `paused`, `completed`, `shuffleChanged`, `repeatChanged`, `volumeChanged`, `positionChanged` (1 s while playing, and after seeks), plus the new `muteChanged` and `wmm.ui.*Changed` events.
3. **Repeat and shuffle values converged** on the const objects `RepeatState` (`off` · `one` · `all`) and `ShuffleState` (`off` · `on`) in `src/models/PlaybackModes.ts`, shared by the playback context and the events.
4. **Mute is app-wide**, owned by the playback provider, with `wmm.playback.toggleMute` and `muteChanged`.
5. **New commands handled**: `wmm.ui.toggleFullscreen`, `wmm.ui.toggleDarkRoom`, `wmm.ui.navigate` (`songs` · `albums` · `artists` · `playlists` · `sync` · `settings`; an unknown page logs a warning and does nothing; there is no genre page yet) and the existing `wmm.ui.openSettings`.
6. **Resource keys** in [section 7](#7-resource-keys) added in en-US and es-MX.
7. **`WMM_THEME_COMMANDS`** in `taxonomy.ts` lists the theme-invokable commands and their parameter domains.

## 11. Review decisions

1. **Phone landscape → `mobile`**: approved.
2. **`Tabs` as a fifth primitive** ([4.4](#44-tabs-new-primitive)): approved.
3. **Overlay hides the Shell entirely**: approved. A desktop Now Playing page that wants transport controls places its own playback bar.
4. **`seekBy` range** of ±300 s: approved.
5. **`wmm.playback.clearQueue`**: stays widget-internal (`PlayQueue` Clear button), not theme-invokable.
