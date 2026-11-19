/**
 * Shared test fixture: the classic-blue `layouts/desktop.xml` from
 * `docs/themes/08-example-classic-blue.md`.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
 *   <Shell>...</Shell>
 * </Layout>
 * ```
 * @example
 * ```ts
 * import { CLASSIC_BLUE_DESKTOP_FILE, classicBlueDesktop } from "@/lib/themes/testing/classicBlueDesktop";
 * ```
 *
 * @module
 */

/**
 * Package path of the fixture layout.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * CLASSIC_BLUE_DESKTOP_FILE; // "layouts/desktop.xml"
 * ```
 */
export const CLASSIC_BLUE_DESKTOP_FILE = "layouts/desktop.xml";

/**
 * The classic-blue desktop layout source.
 *
 * @example
 * ```xml
 * <Shell><PageHost /></Shell>
 * ```
 * @example
 * ```ts
 * parseThemeXml(classicBlueDesktop, { file: CLASSIC_BLUE_DESKTOP_FILE, root: "Layout", spec: "1.0" });
 * ```
 */
export const classicBlueDesktop = `<?xml version="1.0" encoding="UTF-8"?>
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
      <PlayQueue column="1" artwork="true" panel="@panel/inset" rowText="@text/body" />
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
      <Playlist column="0" artwork="true" panel="@panel/inset" rowText="@text/body" />
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
`;
