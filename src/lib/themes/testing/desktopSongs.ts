/**
 * Shared test fixture: the `wmm-default` desktop Songs layout from
 * `docs/themes/pages/songs.md` § 8, with the real playback bar from
 * `docs/themes/pages/playback.md` § 8.
 *
 * @example
 * ```xml
 * <Page id="songs" role="library" titleKey="navigation.songs" default="true">
 *   <TrackList variant="table" density="compact" scrubber="true" />
 * </Page>
 * ```
 * @example
 * ```ts
 * import { parseThemeXml } from "@/lib/themes/parser";
 * import { DESKTOP_SONGS_FILE, desktopSongs } from "@/lib/themes/testing/desktopSongs";
 *
 * const { root } = parseThemeXml(desktopSongs, {
 *   file: DESKTOP_SONGS_FILE,
 *   root: "Layout",
 *   spec: "1.0",
 * });
 * ```
 *
 * @module
 */

/**
 * Package path of the fixture layout.
 *
 * @example
 * ```ts
 * walkElements(root, DESKTOP_SONGS_FILE);
 * ```
 */
export const DESKTOP_SONGS_FILE = "layouts/desktop.xml";

/**
 * Source text of `layouts/desktop.xml` for the desktop Songs page.
 *
 * @example
 * ```ts
 * expect(parseThemeXml(desktopSongs, options).issues).toEqual([]);
 * ```
 */
export const desktopSongs = `<?xml version="1.0" encoding="UTF-8"?>
<Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
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
      <Panel dock="bottom" libraryMode="playback" style="@panel/playback-bar">
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
  <Page id="songs" role="library" titleKey="navigation.songs" default="true">
    <TrackList variant="table" density="compact" scrubber="true" />
  </Page>
  <Page id="albums" role="albums" titleKey="navigation.albums">
    <LibraryBrowser views="albums" initialView="albums" />
  </Page>
  <Page id="artists" role="artists" titleKey="navigation.artists">
    <LibraryBrowser views="artists" initialView="artists" />
  </Page>
  <Page id="playlists" role="playlists" titleKey="navigation.playlists">
    <LibraryBrowser views="playlists" initialView="playlists" />
  </Page>
  <Page id="sync" role="sync" titleKey="navigation.sync">
    <SyncQueue summary="true" />
  </Page>
</Layout>
`;
