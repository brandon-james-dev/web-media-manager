# 08 · Example: Classic Blue (complete package)

A complete theme in the style of an early-2000s desktop media player: a glossy blue chrome frame,
a left task pane for navigation, an orb-shaped play button, a visualizer-centered Now Playing
page and a docked transport bar. It uses every v1 feature and passes every rule in this spec.

## Package

```
classic-blue.wmmtheme.zip
├── manifest.json
├── theme.xml
├── layouts/
│   ├── desktop.xml
│   ├── tablet.xml
│   └── mobile.xml
├── assets/
│   ├── fonts/
│   │   ├── classic-sans-regular.woff2
│   │   └── classic-sans-bold.woff2
│   └── images/
│       ├── frame.png            96×96    nine-slice 12 12 12 12
│       ├── frame@2x.png         192×192
│       ├── logo.svg
│       ├── play-orb.png         56×56
│       ├── play-orb@2x.png      112×112
│       ├── play-orb-hover.png   56×56   (+ @2x)
│       ├── play-orb-down.png    56×56   (+ @2x)
│       ├── pause-orb.png        56×56   (+ @2x)
│       └── task-pane.png        200×600
├── previews/
│   ├── thumb.png                512×320
│   ├── desktop.png
│   └── mobile.png
└── LICENSE
```

## manifest.json

```json
{
  "kind": "theme",
  "spec": "1.0",
  "id": "classic-blue",
  "name": "Classic Blue",
  "version": "1.0.0",
  "description": "Glossy blue chrome, a task pane and an orb play button, in the style of early-2000s desktop players.",
  "author": { "name": "Jane Doe", "url": "https://example.com" },
  "license": "MIT",
  "formFactors": ["desktop", "tablet", "mobile"],
  "colorSchemes": ["dark"],
  "honorsUserAccent": false,
  "thumbnail": "previews/thumb.png",
  "previews": ["previews/desktop.png", "previews/mobile.png"],
  "tags": ["retro", "glossy", "blue"]
}
```

## theme.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Theme xmlns="urn:wmm:theme:1" spec="1.0">
  <Colors>
    <Color id="navy-950" value="#06122b" />
    <Color id="navy-900" value="#0b1a3a" />
    <Color id="navy-800" value="#12285a" />
    <Color id="navy-line" value="#2a4a8a" />
    <Color id="blue-600" value="#2f5fb8" />
    <Color id="blue-500" value="#3d7bea" />
    <Color id="blue-300" value="#9ec3ff" />
    <Color id="ice" value="#e8eefc" />
    <Color id="steel" value="#8aa0c8" />
  </Colors>

  <Palettes>
    <Palette scheme="dark">
      <Set slot="background" value="@color/navy-900" />
      <Set slot="foreground" value="@color/ice" />
      <Set slot="accent" value="@color/blue-500" />
      <Set slot="border" value="@color/navy-line" />
      <Set slot="card" value="@color/navy-800" />
      <Set slot="mutedForeground" value="@color/steel" />
      <Set slot="selection" value="#3d7bea55" />
      <Set slot="progressFill" value="@color/blue-300" />
    </Palette>
  </Palettes>

  <Metrics>
    <Length id="gap-sm" value="4" />
    <Length id="gap-md" value="8" />
    <Length id="radius" value="6" />
    <Length id="pane-width" value="200" />
    <Length id="title-height" value="36" />
    <Length id="transport-height" value="72" />
  </Metrics>

  <Fonts>
    <FontFamily id="ui" fallback="sansSerif">
      <Face src="assets/fonts/classic-sans-regular.woff2" weight="400" style="normal" />
      <Face src="assets/fonts/classic-sans-bold.woff2" weight="700" style="normal" />
    </FontFamily>
  </Fonts>

  <TextStyles>
    <TextStyle id="body" font="@font/ui" size="13" color="@slot/foreground" />
    <TextStyle id="caption" basedOn="@text/body" size="11" color="@slot/mutedForeground" />
    <TextStyle id="nav" basedOn="@text/body" weight="700" color="@color/blue-300" />
    <TextStyle id="pane-header" basedOn="@text/body" size="11" weight="700" transform="uppercase" letterSpacing="1" color="@color/steel" />
    <TextStyle id="logo" basedOn="@text/body" size="15" weight="700" letterSpacing="1" shadow="@shadow/glow" />
  </TextStyles>

  <Images>
    <Image id="chrome-frame" src="assets/images/frame.png" slice="12 12 12 12">
      <Variant scale="2" src="assets/images/frame@2x.png" />
    </Image>
    <Image id="logo" src="assets/images/logo.svg" />
    <Image id="play-orb" src="assets/images/play-orb.png">
      <Variant scale="2" src="assets/images/play-orb@2x.png" />
    </Image>
    <Image id="play-orb-hover" src="assets/images/play-orb-hover.png">
      <Variant scale="2" src="assets/images/play-orb-hover@2x.png" />
    </Image>
    <Image id="play-orb-down" src="assets/images/play-orb-down.png">
      <Variant scale="2" src="assets/images/play-orb-down@2x.png" />
    </Image>
    <Image id="pause-orb" src="assets/images/pause-orb.png">
      <Variant scale="2" src="assets/images/pause-orb@2x.png" />
    </Image>
    <Image id="task-pane" src="assets/images/task-pane.png" />
  </Images>

  <Brushes>
    <LinearGradient id="chrome-gloss" angle="180">
      <Stop offset="0" color="#5f8fe0" />
      <Stop offset="0.5" color="@color/blue-600" />
      <Stop offset="1" color="#1c3f94" />
    </LinearGradient>
    <LinearGradient id="chrome-gloss-hi" angle="180">
      <Stop offset="0" color="#7aa6f0" />
      <Stop offset="1" color="#2a55b0" />
    </LinearGradient>
    <LinearGradient id="chrome-gloss-down" angle="180">
      <Stop offset="0" color="#1c3f94" />
      <Stop offset="1" color="@color/blue-600" />
    </LinearGradient>
    <LinearGradient id="title-strip" angle="90">
      <Stop offset="0" color="@color/navy-950" />
      <Stop offset="1" color="@color/navy-800" />
    </LinearGradient>
    <ImageBrush id="frame" image="@image/chrome-frame" fit="nineSlice" />
    <ImageBrush id="task-pane" image="@image/task-pane" fit="stretch" />
  </Brushes>

  <Shadows>
    <Shadow id="raised" x="0" y="2" blur="6" spread="0" color="#00000066" />
    <Shadow id="inset" x="0" y="1" blur="3" spread="0" color="#00000080" inset="true" />
    <Shadow id="glow" x="0" y="0" blur="6" spread="0" color="#9ec3ff99" />
  </Shadows>

  <ButtonStyles>
    <ButtonStyle id="standard" background="transparent" foreground="@slot/foreground"
                 cornerRadius="@length/radius" padding="6" minWidth="28" minHeight="28"
                 iconSize="16" textStyle="@text/body">
      <State name="hover" background="#ffffff1a" />
      <State name="pressed" background="#00000033" />
      <State name="disabled" opacity="0.4" />
    </ButtonStyle>

    <ButtonStyle id="transport" background="@brush/chrome-gloss" foreground="#ffffff"
                 border="#0d2766" borderWidth="1" cornerRadius="16" padding="6"
                 minWidth="32" minHeight="32" iconSize="16" shadow="@shadow/raised">
      <State name="hover" background="@brush/chrome-gloss-hi" />
      <State name="pressed" background="@brush/chrome-gloss-down" shadow="@shadow/inset" />
      <State name="disabled" opacity="0.4" />
    </ButtonStyle>
    <ButtonStyle id="transport-touch" basedOn="@button/transport" minWidth="44" minHeight="44" iconSize="20" cornerRadius="22" />

    <ButtonStyle id="play-orb" image="@image/play-orb" minWidth="56" minHeight="56">
      <State name="hover" image="@image/play-orb-hover" />
      <State name="pressed" image="@image/play-orb-down" />
      <State name="active" image="@image/pause-orb" />
      <State name="disabled" opacity="0.4" />
    </ButtonStyle>

    <ButtonStyle id="nav" background="transparent" foreground="@color/blue-300"
                 cornerRadius="4" padding="6 10" minHeight="28" iconSize="16" textStyle="@text/nav">
      <State name="hover" background="#ffffff14" foreground="#ffffff" />
      <State name="selected" background="@brush/chrome-gloss" foreground="#ffffff" />
      <State name="pressed" background="@brush/chrome-gloss-down" foreground="#ffffff" />
    </ButtonStyle>
    <ButtonStyle id="nav-touch" basedOn="@button/nav" minWidth="44" minHeight="48" iconSize="20" padding="4" />
  </ButtonStyles>

  <PanelStyles>
    <PanelStyle id="chrome" background="@brush/frame" padding="10" />
    <PanelStyle id="title-strip" background="@brush/title-strip" padding="4 10" cornerRadius="6 6 0 0" />
    <PanelStyle id="task-pane" background="@brush/task-pane" padding="10 6" />
    <PanelStyle id="transport-bar" background="@brush/title-strip" border="@slot/border" borderWidth="1 0 0 0" padding="8 12" />
    <PanelStyle id="content" background="@slot/background" padding="@length/gap-md" />
    <PanelStyle id="inset" background="@slot/card" border="@slot/border" borderWidth="1"
                cornerRadius="4" padding="@length/gap-sm" shadow="@shadow/inset" />
  </PanelStyles>

  <Defaults button="@button/standard" panel="@panel/content" text="@text/body" />
</Theme>
```

## layouts/desktop.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
  <Shell>
    <Panel style="@panel/chrome">
      <DockPanel>
        <Panel dock="top" height="@length/title-height" style="@panel/title-strip">
          <Stack orientation="horizontal" gap="@length/gap-md" align="center">
            <Image source="@image/logo" width="24" height="24" fit="contain" decorative="true" />
            <Text resourceKey="app.title" style="@text/logo" grow="1" />
            <SearchBox scope="library" width="260" />
            <Button command="wmm.ui.openSettings" labelKey="settings.title" icon="@icon/settings" display="icon" />
          </Stack>
        </Panel>

        <Panel dock="bottom" height="@length/transport-height" style="@panel/transport-bar">
          <Grid columns="auto 1*" rows="1*" columnGap="16">
            <Stack column="0" orientation="horizontal" gap="@length/gap-sm" align="center">
              <Button command="wmm.playback.stop" labelKey="playback.stop" icon="@icon/stop" display="icon" style="@button/transport" />
              <Button command="wmm.playback.prev" labelKey="playback.previous" icon="@icon/prev" display="icon" style="@button/transport" />
              <Button command="wmm.playback.playpause" labelKey="playback.playPause" display="icon" style="@button/play-orb" />
              <Button command="wmm.playback.next" labelKey="playback.next" icon="@icon/next" display="icon" style="@button/transport" />
            </Stack>
            <NowPlaying column="1" variant="bar" artwork="true" transport="false" seek="true" volume="true"
                        titleText="@text/body" detailText="@text/caption" />
          </Grid>
        </Panel>

        <Panel dock="start" width="@length/pane-width" style="@panel/task-pane">
          <Stack gap="2">
            <Button command="wmm.ui.navigate" commandParameter="now-playing" labelKey="navigation.nowPlaying" icon="@icon/nowPlaying" style="@button/nav" />
            <Button command="wmm.ui.navigate" commandParameter="library" labelKey="navigation.library" icon="@icon/library" style="@button/nav" />
            <Button command="wmm.ui.navigate" commandParameter="playlists" labelKey="navigation.playlists" icon="@icon/playlists" style="@button/nav" />
            <Button command="wmm.ui.navigate" commandParameter="sync" labelKey="navigation.sync" icon="@icon/sync" style="@button/nav" />
          </Stack>
        </Panel>

        <Panel dock="fill">
          <PageHost />
        </Panel>
      </DockPanel>
    </Panel>
  </Shell>

  <Page id="now-playing" role="nowPlaying" titleKey="navigation.nowPlaying" default="true">
    <Grid columns="1* 260" rows="1*" columnGap="@length/gap-md">
      <Visualizer column="0" selector="true" fallback="artwork" panel="@panel/inset" />
      <Playlist column="1" mode="queue" artwork="true" panel="@panel/inset" rowText="@text/body" />
    </Grid>
  </Page>

  <Page id="library" role="library" titleKey="navigation.library">
    <Grid columns="220 1*" rows="1* 200" columnGap="@length/gap-md" rowGap="@length/gap-md">
      <LibraryBrowser row="0" column="0" rowSpan="2" views="artists albums genres songs"
                      initialView="artists" display="list" artwork="true"
                      panel="@panel/inset" itemText="@text/body" headerText="@text/pane-header" />
      <TrackList row="0" column="1" columns="track title artist album duration offline"
                 alternateRows="true" showHeader="true" panel="@panel/inset"
                 rowText="@text/body" headerText="@text/pane-header" />
      <MetadataEditor row="1" column="1" mode="quick" panel="@panel/inset" labelText="@text/caption" />
    </Grid>
  </Page>

  <Page id="playlists" role="playlists" titleKey="navigation.playlists">
    <Grid columns="240 1*" rows="1*" columnGap="@length/gap-md">
      <Playlist column="0" mode="playlists" artwork="true" panel="@panel/inset" rowText="@text/body" />
      <TrackList column="1" columns="title artist album duration" alternateRows="true"
                 panel="@panel/inset" rowText="@text/body" headerText="@text/pane-header" />
    </Grid>
  </Page>

  <Page id="sync" role="sync" titleKey="navigation.sync">
    <Grid columns="1* 1*" rows="auto 1*" columnGap="@length/gap-md" rowGap="@length/gap-md">
      <Stack row="0" column="0" columnSpan="2" orientation="horizontal" gap="@length/gap-md" align="center">
        <DevicePanel grow="1" storage="true" allowAdd="true" panel="@panel/inset" titleText="@text/pane-header" />
        <Button command="wmm.sync.start" labelKey="sync.start" icon="@icon/sync" style="@button/transport" />
      </Stack>
      <LibraryBrowser row="1" column="0" views="artists albums" display="list" artwork="true" panel="@panel/inset" />
      <SyncQueue row="1" column="1" summary="true" panel="@panel/inset" rowText="@text/body" />
    </Grid>
  </Page>
</Layout>
```

## layouts/tablet.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="tablet">
  <Shell>
    <DockPanel>
      <Panel dock="top" style="@panel/title-strip">
        <Stack orientation="horizontal" gap="@length/gap-sm" align="center">
          <Image source="@image/logo" width="28" height="28" fit="contain" decorative="true" />
          <Button command="wmm.ui.navigate" commandParameter="now-playing" labelKey="navigation.nowPlaying" icon="@icon/nowPlaying" style="@button/nav-touch" />
          <Button command="wmm.ui.navigate" commandParameter="library" labelKey="navigation.library" icon="@icon/library" style="@button/nav-touch" />
          <Button command="wmm.ui.navigate" commandParameter="sync" labelKey="navigation.sync" icon="@icon/sync" style="@button/nav-touch" />
          <SearchBox scope="library" grow="1" />
          <Button command="wmm.ui.openSettings" labelKey="settings.title" icon="@icon/settings" display="icon" style="@button/nav-touch" />
        </Stack>
      </Panel>

      <Panel dock="bottom" style="@panel/transport-bar">
        <Stack orientation="horizontal" gap="@length/gap-md" align="center">
          <Button command="wmm.playback.prev" labelKey="playback.previous" icon="@icon/prev" display="icon" style="@button/transport-touch" />
          <Button command="wmm.playback.playpause" labelKey="playback.playPause" display="icon" style="@button/play-orb" />
          <Button command="wmm.playback.next" labelKey="playback.next" icon="@icon/next" display="icon" style="@button/transport-touch" />
          <NowPlaying grow="1" variant="bar" artwork="true" transport="false" seek="true" volume="false"
                      titleText="@text/body" detailText="@text/caption" />
        </Stack>
      </Panel>

      <Panel dock="fill">
        <PageHost />
      </Panel>
    </DockPanel>
  </Shell>

  <Page id="library" role="library" titleKey="navigation.library" default="true">
    <Grid columns="1* 2*" rows="1*" columnGap="@length/gap-md">
      <LibraryBrowser column="0" views="artists albums playlists" display="grid" artwork="true" panel="@panel/inset" />
      <TrackList column="1" columns="title artist duration offline" panel="@panel/inset" rowText="@text/body" />
    </Grid>
  </Page>

  <Page id="now-playing" role="nowPlaying" titleKey="navigation.nowPlaying">
    <Grid columns="2* 1*" rows="1*" columnGap="@length/gap-md">
      <Visualizer column="0" selector="true" fallback="artwork" panel="@panel/inset" />
      <Playlist column="1" mode="queue" artwork="true" panel="@panel/inset" />
    </Grid>
  </Page>

  <Page id="sync" role="sync" titleKey="navigation.sync">
    <DockPanel>
      <Stack dock="top" orientation="horizontal" gap="@length/gap-md" align="center" margin="0 0 8 0">
        <DevicePanel grow="1" storage="true" allowAdd="true" panel="@panel/inset" />
        <Button command="wmm.sync.start" labelKey="sync.start" icon="@icon/sync" style="@button/transport-touch" />
      </Stack>
      <SyncQueue dock="fill" summary="true" panel="@panel/inset" />
    </DockPanel>
  </Page>
</Layout>
```

## layouts/mobile.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="mobile">
  <Shell>
    <DockPanel>
      <Panel dock="top" style="@panel/title-strip">
        <Stack orientation="horizontal" align="center" justify="spaceBetween">
          <Text resourceKey="app.title" style="@text/logo" />
          <Button command="wmm.ui.openSettings" labelKey="settings.title" icon="@icon/settings" display="icon" style="@button/nav-touch" />
        </Stack>
      </Panel>

      <Stack dock="bottom" gap="0">
        <Panel style="@panel/transport-bar">
          <Stack orientation="horizontal" gap="@length/gap-md" align="center">
            <NowPlaying grow="1" variant="bar" artwork="true" transport="false" seek="false" volume="false"
                        titleText="@text/body" detailText="@text/caption" />
            <Button command="wmm.playback.playpause" labelKey="playback.playPause" display="icon" style="@button/play-orb" />
          </Stack>
        </Panel>
        <Panel style="@panel/task-pane" padding="4">
          <Stack orientation="horizontal" justify="spaceBetween">
            <Button command="wmm.ui.navigate" commandParameter="library" labelKey="navigation.library" icon="@icon/library" style="@button/nav-touch" />
            <Button command="wmm.ui.navigate" commandParameter="now-playing" labelKey="navigation.nowPlaying" icon="@icon/nowPlaying" style="@button/nav-touch" />
            <Button command="wmm.ui.navigate" commandParameter="sync" labelKey="navigation.sync" icon="@icon/sync" style="@button/nav-touch" />
          </Stack>
        </Panel>
      </Stack>

      <Panel dock="fill" padding="0">
        <PageHost />
      </Panel>
    </DockPanel>
  </Shell>

  <Page id="library" role="library" titleKey="navigation.library" default="true">
    <DockPanel>
      <SearchBox dock="top" scope="library" margin="0 0 4 0" />
      <LibraryBrowser dock="top" height="180" views="artists albums playlists" display="grid" artwork="true" />
      <TrackList dock="fill" columns="title artist duration" showHeader="false" rowText="@text/body" />
    </DockPanel>
  </Page>

  <Page id="now-playing" role="nowPlaying" titleKey="navigation.nowPlaying">
    <Visualizer selector="true" fallback="artwork" />
  </Page>

  <Page id="sync" role="sync" titleKey="navigation.sync">
    <DockPanel>
      <DevicePanel dock="top" storage="true" allowAdd="true" />
      <Button dock="top" command="wmm.sync.start" labelKey="sync.start" icon="@icon/sync" style="@button/transport-touch" margin="4 0" />
      <SyncQueue dock="fill" summary="true" />
    </DockPanel>
  </Page>
</Layout>
```

## What the validator reports for this package

| Code | Severity | Where | Why |
|------|----------|-------|-----|
| `W5040` | warning | `assets/images/task-pane.png` | No `@2x` variant. It is stretched, so high-DPI screens upscale it. Acceptable, but flagged. |

There are no errors. All references resolve. The only page-switching command parameters are
declared page ids. Every button has a `labelKey`, and every image has `decorative` or `altKey`.
Touch layouts meet the 44 px target through the `-touch` styles and the 56 px orb. The
`Visualizer` appears once per layout. Every command used is in the v1.0 theme-invokable list.
Every resource key exists in the app registry (`app.title`, `settings.title`, `playback.*`,
`navigation.*`, `sync.start`).
