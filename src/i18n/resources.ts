/**
 * WMM resource registry.
 *
 * The stable, application-owned contract for user-facing text. React
 * components and (later) XML themes reference a RESOURCE KEY such as
 * `playback.playPause`; the active language pack supplies the text. A theme
 * never ships its own strings for app concepts, so every theme is translated
 * the moment a language pack is.
 *
 * Resource keys sit alongside the command/event taxonomy in
 * `src/events/taxonomy.ts` and follow the same rules:
 *
 *  - Each key is defined ONCE, as a key of `WMM_RESOURCES`. The key union,
 *    runtime key list, and pack shape are all DERIVED from that record.
 *  - Keys are a stable public contract. Themes will reference them by name,
 *    so renaming or removing one is a breaking change; adding one is not.
 *  - The registry is the safety boundary for theme references. A theme
 *    attribute such as `labelKey="..."` is only valid when the name exists
 *    here (`isWmmResourceKey`); unknown names are rejected, never rendered.
 *
 * Kinds:
 *  - `text`: a fixed string (`<Text resourceKey="library.artists" />`).
 *  - `template`: a string with positional placeholders `{0}`, `{1}`, ... that
 *    a caller fills with arguments today, and that a future binding layer can
 *    fill with bound values (`<Text templateKey="playback.nowPlayingFormat"
 *    bindings="player.currentTrack.artist, player.currentTrack.title" />`).
 *    `params` names each placeholder in order; its length is the arity every
 *    translation and every caller must honour.
 *  - `plural`: a count-driven string registered ONCE under its base key. The
 *    pack supplies one entry per CLDR plural category the language uses,
 *    suffixed with the capitalised category (`library.songCountOne`,
 *    `library.songCountOther`); `params[0]` is the count and fills `{0}`.
 */

// ------------------------------------------------------------- namespaces
/** Top-level resource namespaces: the first segment of every key. */
export const WMM_RESOURCE_NAMESPACES = [
  "app",
  "common",
  "playback",
  "library",
  "playlist",
  "sync",
  "visualizer",
  "metadata",
  "settings",
  "navigation",
  "layout",
  "search",
  "source",
  "notification",
  "tv",
] as const;

export type WmmResourceNamespace = (typeof WMM_RESOURCE_NAMESPACES)[number];

/**
 * A valid key: a known namespace followed by one or more lowerCamelCase
 * segments, dot separated (`playback.playPause`, `settings.accentColor`).
 */
export const WMM_RESOURCE_KEY_PATTERN = new RegExp(
  `^(?:${WMM_RESOURCE_NAMESPACES.join("|")})(?:\\.[a-z][a-zA-Z0-9]*)+$`
);

// ------------------------------------------------------------ descriptors
export interface TextResourceDescriptor {
  readonly kind: "text";
  /** What the text is for, written for translators and theme authors. */
  readonly description: string;
}

export interface TemplateResourceDescriptor {
  readonly kind: "template";
  readonly description: string;
  /** Placeholder names, in positional order: `params[0]` fills `{0}`. */
  readonly params: readonly string[];
}

export interface PluralResourceDescriptor {
  readonly kind: "plural";
  readonly description: string;
  /** Placeholder names, in positional order: `params[0]` is the count. */
  readonly params: readonly string[];
}

export type ResourceDescriptor =
  | TextResourceDescriptor
  | TemplateResourceDescriptor
  | PluralResourceDescriptor;

/**
 * The CLDR plural categories, in canonical order. A language uses a subset of
 * them; `getPluralCategories` reports which.
 */
export const PLURAL_CATEGORIES = [
  "zero",
  "one",
  "two",
  "few",
  "many",
  "other",
] as const;

export type PluralCategory = (typeof PLURAL_CATEGORIES)[number];

function text(description: string): TextResourceDescriptor {
  return { kind: "text", description };
}

function template<const P extends readonly string[]>(
  description: string,
  params: P
): { readonly kind: "template"; readonly description: string; readonly params: P } {
  return { kind: "template", description, params };
}

function plural<const P extends readonly string[]>(
  description: string,
  params: P
): { readonly kind: "plural"; readonly description: string; readonly params: P } {
  return { kind: "plural", description, params };
}

// --------------------------------------------------------------- registry
/**
 * Every user-facing resource the application owns. Single source of truth:
 * the key is the resource name, the value describes it.
 */
export const WMM_RESOURCES = {
  // app
  "app.title": text("Application name shown in the top bar."),

  // common
  "common.cancel": text("Dismisses a dialog without making changes."),
  "common.close": text("Closes a panel, dialog or view."),
  "common.remove": text("Removes an item from a list."),
  "common.save": text("Saves pending changes."),
  "common.delete": text("Deletes an item permanently."),
  "common.edit": text("Switches a view into editing mode."),
  "common.done": text("Leaves editing mode after the change is saved."),
  "common.create": text("Confirms creating a new item."),
  "common.add": text("Adds an item to a list."),
  "common.clear": text("Clears the current filter or selection."),
  "common.clearSelection": text("Deselects every selected item."),
  "common.selectAll": text("Selects every item in the list."),
  "common.loading": text("Shown while content is being loaded."),
  "common.prev": text("Moves to the previous item."),
  "common.next": text("Moves to the next item."),
  "common.of": text("Joins a position to its total, as in track 3 of 12."),
  "common.name": text("Name field of a form."),
  "common.view": text("Opens the item that was just created."),
  "common.reset": text("Restores a form to its saved values."),
  "common.moreActions": text("Opens a menu of further actions for a row."),
  "common.moreOptions": text("Opens a menu of alternative options for a button."),
  "common.clickToSelect": text("Invites the user to pick a file."),
  "common.fullScreen": text("Enters the full screen view."),
  "common.exitFullScreen": text("Leaves the full screen view."),
  "common.unknownArtist": text("Stand-in artist name for a track with no artist tag."),
  "common.back": text("Returns to the previous step of a flow."),
  "common.unknown": text("Stand-in value for a field that has none."),

  // playback
  "playback.playPause": text("Toggles between playing and paused."),
  "playback.play": text("Starts or resumes playback."),
  "playback.pause": text("Pauses playback."),
  "playback.next": text("Skips to the next track."),
  "playback.previous": text("Returns to the previous track."),
  "playback.nextTrack": text("Skips to the next track (long form)."),
  "playback.previousTrack": text("Returns to the previous track (long form)."),
  "playback.stop": text("Stops playback."),
  "playback.volume": text("Volume control."),
  "playback.mute": text("Mutes audio output."),
  "playback.unmute": text("Restores audio output after muting."),
  "playback.shuffle": text("Toggles shuffled playback order."),
  "playback.repeat": text("Cycles the repeat mode."),
  "playback.seek": text("Playback position slider."),
  "playback.buffering": text("Shown while the current track is loading."),
  "playback.nothingPlaying": text("Shown in place of a title when no track is loaded."),
  "playback.nowPlaying": text("Label for the currently playing track."),
  "playback.nowPlayingFormat": template(
    "Current track summary built from its artist and title.",
    ["artist", "title"]
  ),
  "playback.openNowPlaying": text("Opens the full now playing view."),
  "playback.closeNowPlaying": text("Closes the full now playing view."),
  "playback.upNext": text("Heading for the tracks queued after the current one."),
  "playback.queue": text("The playback queue."),
  "playback.playAll": text("Plays every track in the current list."),
  "playback.playSelection": text("Plays every selected track."),
  "playback.playSong": text("Plays the selected song."),
  "playback.playAlbum": text("Plays every track on the album."),
  "playback.shuffleAlbum": text("Plays the album in a random order."),
  "playback.addToQueue": text("Adds the selection to the playback queue."),
  "playback.playPreview": text("Starts the short preview of the edited song."),
  "playback.pausePreview": text("Pauses the short preview of the edited song."),
  "playback.section": text("Heading of the playback actions in the song menu."),
  "playback.lyrics": text("Lyrics panel of the now playing view."),
  "playback.hidePanel": template("Hides the named now playing panel.", ["panel"]),
  "playback.darkRoom": text("Dark room mode of the now playing view."),
  "playback.lightsOn": text("Leaves dark room mode."),
  "playback.noLyrics": text("Shown when the current song has no lyrics."),
  "playback.queueHeading": plural(
    "Heading of the now playing queue, naming how many songs it holds.",
    ["count"]
  ),
  "playback.playlist": text("The playback queue popover."),
  "playback.playlistHeading": plural(
    "Heading of the queue popover, naming how many songs it holds.",
    ["count"]
  ),

  // library
  "library.artists": text("Artists in the library."),
  "library.albums": text("Albums in the library."),
  "library.genres": text("Genres in the library."),
  "library.songs": text("Songs in the library."),
  "library.sources": text("Music sources feeding the library."),
  "library.noSongsFound": text("Shown when a song list has nothing to display."),
  "library.noResults": text("Shown when a song table has no rows to display."),
  "library.albumTitle": text("Sort field that orders albums by their title."),
  "library.viewGrid": text("View mode that shows albums as a grid of covers."),
  "library.viewCoverFlow": text(
    "View mode that shows albums as a scrolling cover carousel."
  ),
  "library.unknownAlbum": text("Stand-in album name for a track with no album tag."),
  "library.allArtists": text(
    "Entry that shows every artist in the library at once."
  ),
  "library.artistCount": plural("Artist count in a list.", ["count"]),
  "library.albumCount": plural("Album count in a list.", ["count"]),
  "library.songCount": plural("Song count in a list.", ["count"]),
  "library.totalMinutes": plural(
    "Total length of a collection, in whole minutes.",
    ["minutes"]
  ),
  "library.toggleSortOrder": text("Switches the list between A-Z and Z-A."),
  "library.backToArtists": text("Returns from an artist to the artist list."),
  "library.deselectAll": text("Clears the current multi-selection."),
  "library.resizeColumn": template(
    "Accessible name of a column's resize handle.",
    ["column"]
  ),
  "library.showAllFrom": template(
    "Accessible name of an album cell value that filters the page by it.",
    ["value"]
  ),
  "library.deselectAllSongs": text(
    "Clears the current multi-selection of songs."
  ),
  "library.deselectCount": template(
    "Clears the selection, naming how many songs it holds.",
    ["count"]
  ),
  "library.editAlbum": text("Opens the album editor."),
  "library.flipBack": text("Turns the album cover back to its front."),
  "library.scrollAlbums": text("Slider that moves through the album carousel."),
  "library.noArtwork": text("Shown when a song has no embedded artwork."),
  "library.noCoverArt": text("Shown when an album has no cover image."),
  "library.quickEdit": text("Compact form for editing a song's basic tags."),
  "library.noSelection": text(
    "Shown in the metadata editor when no song is picked."
  ),
  "library.quickEditSelected": template(
    "Heading of the compact form while several songs are selected.",
    ["count"]
  ),
  "library.advancedEdit": text("Full form for editing every tag of a song."),
  "library.applyToCount": template(
    "Applies the edited tags to every selected song.",
    ["count"]
  ),
  "library.editing": text("Heading of the editing actions in the song menu."),
  "library.offline": text("Heading of the offline download actions in the song menu."),
  "library.removeDownload": text("Deletes the cached copy of a song."),
  "library.removeDownloadHint": text(
    "Tooltip for the button that deletes the cached copy."
  ),
  "library.removeDownloadFailed": text(
    "Toast shown when a cached copy could not be deleted."
  ),
  "library.makeAvailableOffline": text(
    "Caches a song so it plays without the network."
  ),
  "library.makeAvailableOfflineNamed": template(
    "Caches the named song so it plays without the network.",
    ["name"]
  ),
  "library.downloading": template("Shown while the named song is being cached.", [
    "name",
  ]),
  "library.cacheFailed": text("Toast shown when a song could not be cached."),
  "library.cacheFailedCount": plural(
    "Toast shown when songs could not be cached.",
    ["count"]
  ),
  "library.removedDownload": text("Toast shown after a cached copy is deleted."),
  "library.availableOffline": text("Toast shown after songs are cached."),
  "library.songsCached": plural("Songs that were cached.", ["count"]),
  "library.storedOnDevice": text(
    "Shown for a song whose audio already lives on this device."
  ),
  "library.addToFavorites": text("Marks a song as a favorite."),
  "library.removeFromFavorites": text("Removes a song from the favorites."),
  "library.favoriteSelection": text("Marks every selected song as a favorite."),
  "library.unfavoriteSelection": text(
    "Removes every selected song from the favorites."
  ),
  "library.favoriteBoth": text(
    "Shown when a song is a favorite on this device and on the server."
  ),
  "library.favoriteServer": text("Shown when a song is a favorite on the server."),
  "library.alphabetIndex": text("Accessible name of the A-Z jump bar."),
  "library.closeAlbum": text("Closes the album detail sheet."),
  "library.song": text("Stand-in label for a single song in a menu heading."),

  // playlist
  "playlist.current": text("The playlist currently open."),
  "playlist.add": text("Adds the selection to a playlist."),
  "playlist.save": text("Saves the playlist."),
  "playlist.delete": text("Deletes the playlist."),
  "playlist.noTracks": text("Shown when a playlist has no tracks."),
  "playlist.dropToAdd": text("Shown while dragging tracks over a playlist."),
  "playlist.backToPlaylists": text("Returns from a playlist to the playlist list."),
  "playlist.dragToReorder": text("Handle that reorders a playlist by dragging."),
  "playlist.deleteTitle": text(
    "Title of the dialog that confirms deleting a playlist."
  ),
  "playlist.deleteDescription": template(
    "Explains that deleting a playlist keeps its songs in the library.",
    ["name"]
  ),
  "playlist.deleteNamed": template(
    "Accessible name of the button that deletes the named playlist.",
    ["name"]
  ),
  "playlist.filter": text("Field that narrows the playlist list."),
  "playlist.new": text("Creates a new playlist."),
  "playlist.create": text("Menu entry that creates a new playlist."),
  "playlist.rename": text("Title of the dialog that renames a playlist."),
  "playlist.name": text("Name field of the playlist form."),
  "playlist.readOnly": text("Label for a playlist that cannot be edited here."),
  "playlist.readOnlyFrom": template(
    "Label for a read-only playlist, naming the source that owns it.",
    ["source"]
  ),
  "playlist.readOnlyManaged": text(
    "Explains that the playlist is written by its music source."
  ),
  "playlist.unknownSource": text(
    "Stand-in name for a source that is no longer known."
  ),
  "playlist.none": text("Shown when the user has no playlists."),
  "playlist.noMatches": text("Shown when the playlist filter matches nothing."),
  "playlist.count": plural("Playlist count in the list.", ["count"]),
  "playlist.inThisPlaylist": template(
    "Heading of the open playlist's tracks, naming how many there are.",
    ["count"]
  ),
  "playlist.removeTrack": text("Takes a track out of the playlist."),
  "playlist.empty": text("Shown when the open playlist has no tracks."),
  "playlist.select": text("Shown when no playlist is open."),
  "playlist.title": text("Stand-in heading while a playlist is loading."),
  "playlist.reorder": text("Sorts the playlist's tracks by title."),
  "playlist.reorderLabel": text(
    "Accessible name of the button that sorts the playlist's tracks."
  ),
  "playlist.selectAllTracks": text("Selects every track in the playlist."),
  "playlist.removeSelected": template(
    "Removes the selected tracks, naming how many there are.",
    ["count"]
  ),
  "playlist.removeSelectedTracks": template(
    "Accessible name of the button that removes the selected tracks.",
    ["count"]
  ),
  "playlist.addSelection": text("Adds the selected songs to a playlist."),
  "playlist.addedTo": template(
    "Toast shown after songs are added to the named playlist.",
    ["name"]
  ),
  "playlist.addFailed": template(
    "Toast shown when songs could not be added to the named playlist.",
    ["name"]
  ),
  "playlist.created": template(
    "Toast shown after the named playlist is created.",
    ["name"]
  ),
  "playlist.addCount": plural(
    "Says how many songs the new playlist will receive.",
    ["count"]
  ),
  "playlist.section": text("Heading of the playlist actions in the song menu."),

  // sync
  "sync.title": text("The device sync area."),
  "sync.queue": text("Songs waiting to be copied to a device."),
  "sync.devices": text("Devices available for sync."),
  "sync.noDevices": text("Shown when no sync device is configured."),
  "sync.addDevice": text("Starts adding a sync device."),
  "sync.start": text("Starts copying queued songs to a device."),
  "sync.cancel": text("Cancels a running sync."),
  "sync.addToQueue": text("Queues the selected songs for the next device sync."),
  "sync.removeFromQueue": text("Takes the selected songs out of the sync queue."),
  "sync.syncing": text("Shown in the sync queue header while a sync is running."),
  "sync.completed": text("Shown in the sync queue header once a sync has finished."),
  "sync.progressCancel": text(
    "Accessible name of the sync progress bar, which cancels the run."
  ),
  "sync.clearQueueAction": text("Confirms clearing the queue of synced tracks."),
  "sync.clearQueueTitle": text(
    "Title of the dialog that confirms clearing the synced queue."
  ),
  "sync.clearQueueHint": text(
    "Tooltip for the button that clears the synced queue."
  ),
  "sync.clearQueueLabel": text(
    "Accessible name of the button that clears a finished sync queue."
  ),
  "sync.clearQueueDescription": plural(
    "Explains that clearing the queue keeps the synced tracks on the device.",
    ["count"]
  ),
  "sync.emptyQueueHint": text("Tooltip for the sync button while the queue is empty."),
  "sync.syncQueued": plural(
    "Tooltip for the sync button, naming how many tracks are queued.",
    ["count"]
  ),
  "sync.syncQueueToDevice": text(
    "Accessible name of the button that writes the queue to the device."
  ),
  "sync.selectAllQueued": text(
    "Accessible name of the button that selects every queued track."
  ),
  "sync.selectAllSynced": text(
    "Accessible name of the button that selects every track on the device."
  ),
  "sync.removeSelectedCount": template(
    "Removes the selected queued tracks, naming how many there are.",
    ["count"]
  ),
  "sync.removeSelectedTracks": template(
    "Accessible name of the button that removes the selected queued tracks.",
    ["count"]
  ),
  "sync.removeSelectedFromDevice": template(
    "Removes the selected tracks from the device, naming how many there are.",
    ["count"]
  ),
  "sync.removeSelectedTracksFromDevice": template(
    "Accessible name of the button that removes the selected tracks from the device.",
    ["count"]
  ),
  "sync.trackCount": plural(
    "Track count and size, shown beside the queue count.",
    ["count", "size"]
  ),
  "sync.syncedToDevice": text(
    "Shown on a queued track that has been written to the device."
  ),
  "sync.dropToQueue": text(
    "Shown in an empty sync queue, inviting a track drop."
  ),
  "sync.refreshDevice": text("Re-reads the tracks stored on the device."),
  "sync.rereadDevice": text(
    "Tooltip for the button that re-reads the device's contents."
  ),
  "sync.nothingSynced": text("Shown when the device holds no tracks."),

  // visualizer
  "visualizer.title": text("The audio visualizer."),
  "visualizer.select": text("Chooses which visualizer to show."),
  "visualizer.settings": text("Opens settings for the active visualizer."),
  "visualizer.loadingPlugins": text(
    "Shown while the installed plugins are read."
  ),
  "visualizer.noneInstalled": text(
    "Shown when no visualizer plugin is installed."
  ),
  "visualizer.noVisualizerInstalled": text(
    "Shown in the visualizer host when no plugin is installed."
  ),
  "visualizer.installVisualizer": text(
    "Opens the plugin manager to install a visualizer."
  ),
  "visualizer.loadingVisualizer": text(
    "Shown while the visualizer plugin is loading."
  ),
  "visualizer.unknownAuthor": text(
    "Stand-in author name for a plugin without one."
  ),
  "visualizer.configureNamed": template(
    "Accessible name of the button that opens the named plugin's settings.",
    ["name"]
  ),
  "visualizer.pluginsTitle": text("Heading of the plugin manager dialog."),
  "visualizer.pluginsDescription": text(
    "Summary under the plugin manager heading."
  ),
  "visualizer.installed": text("Tab that lists the installed plugins."),
  "visualizer.install": text("Tab that installs a plugin from an archive."),
  "visualizer.fieldId": text("Plugin id field of the details list."),
  "visualizer.fieldRuntime": text(
    "Plugin runtime field of the details list."
  ),
  "visualizer.fieldAuthor": text("Plugin author field of the details list."),
  "visualizer.fieldEntry": text(
    "Plugin entry file field of the details list."
  ),
  "visualizer.fieldFiles": text(
    "Plugin file count field of the details list."
  ),
  "visualizer.fieldSize": text("Plugin size field of the details list."),
  "visualizer.fieldInstalled": text(
    "Plugin install date field of the details list."
  ),
  "visualizer.removeConfirm": template(
    "Asks before removing the named plugin and its stored files.",
    ["name"]
  ),
  "visualizer.removePlugin": text("Removes the selected plugin."),
  "visualizer.selectToSeeDetails": text(
    "Shown when no plugin is selected."
  ),
  "visualizer.pluginZip": text("Label of the plugin archive field."),
  "visualizer.zipHint": text(
    "Explains what the plugin archive must contain."
  ),
  "visualizer.updateIfInstalled": text(
    "Replaces a plugin that is already installed."
  ),
  "visualizer.updateIfInstalledHint": text(
    "Explains what replacing a plugin does."
  ),
  "visualizer.installing": text(
    "Shown while a plugin archive is installed."
  ),
  "visualizer.installPlugin": text("Installs the chosen plugin archive."),
  "visualizer.loadingExample": text(
    "Shown while the example plugin is downloaded."
  ),
  "visualizer.installExample": text("Installs the bundled example plugin."),
  "visualizer.installedNamed": template(
    "Confirmation naming the plugin and version that were installed.",
    ["name", "version"]
  ),
  "visualizer.exampleNotFound": template(
    "Shown when the example plugin could not be downloaded.",
    ["status"]
  ),
  "visualizer.settingsNamed": template(
    "Heading of the named plugin's settings dialog.",
    ["name"]
  ),
  "visualizer.settingsDescription": text(
    "Explains where plugin settings are stored."
  ),
  "visualizer.selectToConfigure": text(
    "Shown when no visualizer is selected to configure."
  ),
  "visualizer.noSettings": text(
    "Shown when the selected visualizer declares no settings."
  ),
  "visualizer.resetDefaults": text(
    "Restores the plugin settings to their defaults."
  ),
  "visualizer.runtimeWebgl": text(
    "Runtime that renders a WebGL fragment shader."
  ),
  "visualizer.runtimeCanvas2d": text(
    "Runtime that renders a Canvas 2D plugin module."
  ),
  "visualizer.runtimeWasm": text(
    "Runtime that runs a WebAssembly module."
  ),

  // metadata
  "metadata.title": text("Track title field."),
  "metadata.artist": text("Track artist field."),
  "metadata.album": text("Track album field."),
  "metadata.track": text("Track number field."),
  "metadata.tracks": text("Total number of tracks on the release."),
  "metadata.disc": text("Disc number field."),
  "metadata.discs": text("Total number of discs in the release."),
  "metadata.duration": text("Length of a track."),
  "metadata.genre": text("Genre field."),
  "metadata.year": text("Release year field."),
  "metadata.albumArtist": text("Album artist field."),
  "metadata.source": text("Music source a song was imported from."),
  "metadata.albumArt": text("Cover image field."),
  "metadata.trackPosition": text(
    "Heading of the track and disc number fields."
  ),
  "metadata.credits": text("Heading of the composer and copyright fields."),
  "metadata.composer": text("Composer field."),
  "metadata.bpm": text("Beats per minute field."),
  "metadata.bitrate": text("Bitrate column of the song table."),
  "metadata.copyright": text("Copyright field."),
  "metadata.encoder": text("Encoder field."),
  "metadata.textFields": text("Heading of the free text fields."),
  "metadata.comment": text("Comment field."),
  "metadata.lyrics": text("Lyrics field."),
  "metadata.explicit": text("Marks a track with explicit lyrics."),
  "metadata.multipleValues": text(
    "Placeholder shown when the selected songs disagree on a field."
  ),
  "metadata.onlineSearch": text("Opens the online metadata lookup."),
  "metadata.apply": text("Copies the looked-up metadata into the form."),
  "metadata.updateDescription": text("Summary of the song editor."),
  "metadata.previousSong": text("Moves to the previous song in the editor."),
  "metadata.nextSong": text("Moves to the next song in the editor."),

  // settings
  "settings.title": text("The settings screen."),
  "settings.pageTitle": text("Heading of the settings and data screen."),
  "settings.description": text("Summary under the settings heading."),
  "settings.shortcuts": text("The keyboard shortcuts reference."),
  "settings.display": text("Light, dark or system display preference."),
  "settings.displayLockedByTheme": text(
    "Note that the active custom theme fixes the display preference."
  ),
  "settings.themeLight": text("Light colour theme."),
  "settings.themeDark": text("Dark colour theme."),
  "settings.themeSystem": text("Follow the operating system colour theme."),
  "settings.accentColor": text("Accent colour preference."),
  "settings.accentLockedByTheme": text(
    "Note that the active custom theme supplies its own accent colour."
  ),
  "settings.language": text("Display language preference."),
  "settings.languageAuto": template(
    "Language option that follows the browser, naming the detected language.",
    ["language"]
  ),
  "settings.saved": text("Confirmation shown after the settings are saved."),
  "settings.save": text("Saves the settings form."),
  "settings.shortcutOpenShortcuts": text(
    "Keyboard shortcut that opens the shortcuts reference."
  ),
  "settings.shortcutOpenSettings": text(
    "Keyboard shortcut that opens the settings screen."
  ),
  "settings.shortcutNext": text(
    "Keyboard shortcut that moves to the next song or album."
  ),
  "settings.shortcutPrev": text(
    "Keyboard shortcut that moves to the previous song or album."
  ),
  "settings.shortcutPlayPause": text(
    "Keyboard shortcut that toggles playback."
  ),
  "settings.shortcutQueue": text(
    "Keyboard shortcut that queues the selected song."
  ),
  "settings.shortcutEdit": text(
    "Keyboard shortcut that opens the advanced editor."
  ),
  "settings.shortcutFullscreen": text(
    "Keyboard shortcut that toggles the full screen now playing view."
  ),
  "settings.shortcutClose": text(
    "Keyboard shortcut that closes the editor."
  ),
  "settings.extensibility": text(
    "Heading of the settings card grouping custom themes and visualizer plugins."
  ),
  "settings.extensibilityDescription": text(
    "Explains what the extensibility card contains."
  ),
  "settings.visualizers": text("Heading of the visualizer plugins section."),
  "settings.visualizersDescription": text(
    "Summary under the visualizer plugins heading."
  ),
  "settings.installPlugins": text("Opens the visualizer plugin manager."),
  "settings.data": text("Heading of the song data card."),
  "settings.dataDescription": text("Summary under the song data heading."),
  "settings.clearDatabase": text(
    "Label of the action that clears every song."
  ),
  "settings.clearDatabaseTitle": text(
    "Title of the dialog that confirms clearing every song."
  ),
  "settings.clearDatabaseDescription": text(
    "Explains that clearing the song database cannot be undone."
  ),
  "settings.songsCleared": text(
    "Toast shown after every song is cleared from the database."
  ),
  "settings.themeTrialPrompt": template(
    "Bar shown after a theme is applied, counting down the seconds until it reverts.",
    ["seconds"]
  ),
  "settings.themeTrialKeep": text(
    "Keeps the newly applied theme and dismisses the trial bar."
  ),
  "settings.themeTrialRevert": text(
    "Restores the previous theme from the trial bar."
  ),
  "settings.themes": text("Heading of the custom theme packages section."),
  "settings.themesDescription": text(
    "Explains the custom themes section of the extensibility card."
  ),
  "settings.themeBuiltIn": text("Selects the theme the app ships with."),
  "settings.themeBuiltInDescription": text(
    "Second line of the built-in theme row in the custom themes list."
  ),
  "settings.themeInstall": text("Opens the file picker for a theme ZIP."),
  "settings.themeReset": text("Returns to the built-in theme."),
  "settings.themeResetDone": text(
    "Toast shown after the built-in theme is restored."
  ),
  "settings.themeRemoveNamed": template(
    "Removes the named theme, as the button's accessible label.",
    ["name"]
  ),
  "settings.themeRemoveTitle": text(
    "Title of the dialog that confirms removing a theme."
  ),
  "settings.themeRemoveDescription": template(
    "Explains that the named theme and its files are deleted.",
    ["name"]
  ),
  "settings.themeInstallFailed": text(
    "Title shown when a theme package has errors and cannot be installed."
  ),
  "settings.themeByAuthor": template("Names the theme's author.", ["author"]),
  "settings.themeVersion": template("Names the theme's version.", ["version"]),
  "settings.themeChangeUpdate": template(
    "Says the package updates the installed version.",
    ["from", "to"]
  ),
  "settings.themeChangeReinstall": template(
    "Asks whether to reinstall a version that is already installed.",
    ["version"]
  ),
  "settings.themeChangeDowngrade": template(
    "Warns that the package is older than the installed version.",
    ["installed", "incoming"]
  ),
  "settings.themeActionInstall": text("Installs the reviewed theme."),
  "settings.themeActionUpdate": text("Updates the installed theme."),
  "settings.themeActionReinstall": text("Reinstalls the installed theme."),
  "settings.themeActionDowngrade": text(
    "Installs the older package after the warning."
  ),
  "settings.themeInstalled": template(
    "Toast shown after the named theme is installed.",
    ["name"]
  ),
  "settings.themeApplyFailed": text(
    "Toast shown when the chosen theme could not be applied."
  ),
  "settings.themeCrashReverted": text(
    "Toast shown when a theme layout crashed and the theme was turned off."
  ),

  // navigation
  "navigation.library": text("Navigates to the library."),
  "navigation.songs": text("Navigates to the song list."),
  "navigation.albums": text("Navigates to albums."),
  "navigation.artists": text("Navigates to artists."),
  "navigation.playlists": text("Navigates to playlists."),
  "navigation.nowPlaying": text("Navigates to the now playing view."),
  "navigation.sync": text("Navigates to device sync."),
  "navigation.sidebar": text("Toggles the playlists and sync sidebar."),
  "navigation.closeSidebar": text("Closes the playlists and sync sidebar."),
  "navigation.sidebarBlocked": text(
    "Tooltip shown when the sidebar view is already open full screen."
  ),

  // layout
  "layout.resizePanel": text(
    "Names the drag handle that resizes a docked theme panel."
  ),

  // search
  "search.label": text("Opens or labels the search field."),
  "search.placeholder": text("Placeholder of the library search field."),
  "search.clear": text("Empties the search field."),
  "search.searching": text("Shown while an online lookup is running."),
  "search.selectResult": text("Shown before a lookup result is picked."),
  "search.noAlbumPhoto": text("Shown when a lookup result has no cover image."),
  "search.noMatches": text("Shown when an autocomplete has no suggestions."),
  "search.noSongs": text("Shown when the add-search matches no songs."),
  "search.songsToAdd": text(
    "Placeholder of the field that searches songs to add."
  ),
  "search.resultCount": plural("Search result count.", ["count"]),
  "search.matchCount": plural("Songs matching the add-search.", ["count"]),
  "search.matchCountCapped": template(
    "Match count when the add-search stops at its result limit.",
    ["limit"]
  ),
  "search.addAllGenreTracks": template(
    "Adds every track of the named genre.",
    ["genre"]
  ),
  "search.addAllArtistTracks": template(
    "Adds every track by the named artist.",
    ["artist"]
  ),
  "search.addAllAlbumTracks": template(
    "Adds every track of the named album.",
    ["album"]
  ),
  "search.addSong": template("Adds the named song.", ["title"]),
  "search.titlePlaceholder": text(
    "Placeholder of the title field in the online lookup."
  ),
  "search.artistPlaceholder": text(
    "Placeholder of the artist field in the online lookup."
  ),
  "search.albumPlaceholder": text(
    "Placeholder of the album field in the online lookup."
  ),

  // source
  "source.filter": text("Opens the music source filter."),
  "source.editableNamed": template(
    "Tooltip for a source whose library can be edited here.",
    ["source"]
  ),
  "source.readOnlyNamed": template(
    "Tooltip for a source whose library cannot be edited here.",
    ["source"]
  ),
  "source.add": text("Opens the flow that attaches a new music source."),
  "source.addTitle": text("Heading of the add-source flow."),
  "source.addDescription": text("Invites the user to pick a source type."),
  "source.addFailed": template(
    "Toast shown when a source could not be added.",
    ["name"]
  ),
  "source.updated": template(
    "Toast shown after the named source is updated.",
    ["name"]
  ),
  "source.updateFailed": template(
    "Toast shown when the named source could not be updated.",
    ["name"]
  ),
  "source.editNamed": template(
    "Names the source being edited, as a dialog title or button label.",
    ["name"]
  ),
  "source.syncNamed": template(
    "Accessible name of the button that re-syncs the named source.",
    ["name"]
  ),
  "source.notSupported": text(
    "Shown for a source type this browser cannot use."
  ),
  "source.removing": text(
    "Progress notification title while a music source is removed."
  ),
  "source.removeFailed": text(
    "Toast shown when a music source could not be removed."
  ),
  "source.removeTitle": text(
    "Title of the dialog that confirms removing a music source, and its confirm button."
  ),
  "source.removeDescription": text(
    "Explains that removing a source keeps the songs already imported."
  ),
  "source.noneAdded": text("Shown when no music source has been added yet."),
  "source.kindLocal": text(
    "Badge for a source that reads a folder on this computer."
  ),
  "source.kindServer": text("Badge for a source served by a WMM server."),
  "source.kindSync": text(
    "Badge for a portable device used as a sync target."
  ),
  "source.localDescription": text(
    "One-line description of the on-device source type."
  ),
  "source.syncDescription": text(
    "One-line description of the sync-device source type."
  ),
  "source.subsonicName": text("Display name of the Subsonic source type."),
  "source.subsonicDescription": text(
    "One-line description of the Subsonic source type."
  ),
  "source.connect": text("Confirms the connection settings of a source."),
  "source.connecting": text(
    "Shown while a source connection is being established."
  ),
  "source.connectFailed": text(
    "Shown when a source connection failed for an unknown reason."
  ),
  "source.invalidCredentials": text(
    "Shown when a server rejected the username or password."
  ),
  "source.serverUnreachable": text(
    "Shown when a server could not be reached."
  ),
  "source.folderUnsupported": text(
    "Shown when the browser cannot pick a folder."
  ),
  "source.folderNamedAlreadyAdded": template(
    "Shown when the named folder is already part of the source.",
    ["name"]
  ),
  "source.folderAlreadyAdded": template(
    "Shown when the named folder is already part of the source.",
    ["name"]
  ),
  "source.chooseAtLeastOneFolder": text(
    "Shown when a source needs at least one folder."
  ),
  "source.chooseFolder": text("Invites the user to pick a folder."),
  "source.fieldRequired": template(
    "Shown when a required field is empty.",
    ["field"]
  ),
  "source.removeFolderNamed": template(
    "Accessible name of the button that drops the named folder.",
    ["name"]
  ),
  "source.addFolder": text(
    "Accessible name of the button that adds a folder."
  ),
  "source.addAnotherFolder": text("Adds one more folder to the source."),
  "source.clickToChangeFolder": text("Hint under a picked folder."),
  "source.browseForFolder": text("Hint under the empty folder picker."),
  "source.musicFolders": text("Label of the folder list field."),
  "source.serverUrl": text("Label of the server URL field."),
  "source.username": text("Label of the account name field."),
  "source.password": text("Label of the password field."),
  "source.musicFolderId": text(
    "Label of the optional music folder id field."
  ),
  "source.usernamePlaceholder": text(
    "Placeholder of the account name field."
  ),
  "source.enterServerUrl": text(
    "Shown when the server URL field is empty."
  ),
  "source.invalidServerUrl": text(
    "Shown when the server URL is not an http(s) URL."
  ),
  "source.usernameRequired": text(
    "Shown when the account name field is empty."
  ),
  "source.passwordRequired": text(
    "Shown when the password field is empty."
  ),
  "source.credentialsRequired": text(
    "Shown when the server URL, account name or password is missing."
  ),
  "source.urlAndUsernameRequired": text(
    "Shown when the server URL or account name is missing."
  ),

  // notification
  "notification.songUpdated": text(
    "Toast title shown after a song's tags are saved."
  ),
  "notification.songUpdatedDetail": template(
    "Toast detail naming the song whose tags were saved.",
    ["title", "artist"]
  ),
  "notification.empty": text(
    "Shown in the notification list when it holds nothing."
  ),
  "notification.title": text(
    "Accessible name of the button that opens the notification list."
  ),
  "notification.importingSongs": text(
    "Progress heading for the song phase of an import."
  ),
  "notification.importingPlaylists": text(
    "Progress heading for the playlist phase of an import."
  ),
  "notification.playlistsPhase": text(
    "Toast title while an import is in its playlist phase."
  ),
  "notification.generatingThumbnails": text(
    "Progress heading for thumbnail generation."
  ),
  "notification.downloadingSongs": text(
    "Progress heading for a bulk offline download."
  ),
  "notification.removingTracks": text(
    "Progress heading for a device track removal."
  ),
  "notification.removingMusicSource": text(
    "Progress heading for a music source removal."
  ),
  "notification.completed": text(
    "State word shown when a progress step has finished."
  ),
  "notification.progressCount": template(
    "Progress count of finished items out of the total.",
    ["completed", "total"]
  ),
  "notification.playlistCount": plural("Playlist count.", ["count"]),
  "notification.songCount": plural("Song count.", ["count"]),
  "notification.trackCount": plural("Track count.", ["count"]),
  "notification.failedCount": template(
    "Count of items that failed.",
    ["count"]
  ),
  "notification.started": text("Detail shown when a job starts."),
  "notification.finishedSuccessfully": text(
    "Detail shown when a job finishes."
  ),
  "notification.unknownError": text(
    "Fallback detail when a job fails without a message."
  ),
  "notification.job": text("Fallback job name when an event carries none."),
  "notification.jobStarted": template("Toast title when a job starts.", [
    "jobType",
  ]),
  "notification.jobCompleted": template("Toast title when a job finishes.", [
    "jobType",
  ]),
  "notification.jobFailed": template("Toast title when a job fails.", [
    "jobType",
  ]),
  "notification.jobCanceled": template("Toast title when a job is canceled.", [
    "jobType",
  ]),
  "notification.jobTypeThumbnailGeneration": text(
    "Job name for thumbnail generation."
  ),
  "notification.jobTypeBulkImport": text("Job name for a bulk import."),
  "notification.jobTypeBulkEdit": text("Job name for a bulk edit."),
  "notification.jobTypeDeviceSync": text("Job name for a device sync."),
  "notification.jobTypeDeviceRemove": text("Job name for a device removal."),
  "notification.jobTypeSourceRemove": text(
    "Job name for a music source removal."
  ),
  "notification.jobTypeOfflineDownload": text(
    "Job name for an offline download."
  ),
  "notification.alreadyOnDevice": text(
    "Toast title when queued songs are already on the device."
  ),
  "notification.skippedOnDevice": plural(
    "Toast detail for songs skipped because they are already on the device.",
    ["count"]
  ),
  "notification.notAvailableOffline": text(
    "Toast title when queued songs are not downloaded."
  ),
  "notification.skippedNotOffline": plural(
    "Toast detail for songs skipped because they are not downloaded.",
    ["count"]
  ),
  "notification.noSongsToSync": text(
    "Toast title when a sync starts with an empty queue."
  ),
  "notification.noSongsToSyncDetail": text(
    "Toast detail explaining that the sync queue was empty."
  ),
  "notification.theDevice": text(
    "Stand-in for a device name when the device is unknown."
  ),
  "notification.syncCanceled": text("Toast title when a device sync stops."),
  "notification.syncCanceledDetail": template(
    "Toast detail naming the device whose sync stopped.",
    ["device"]
  ),
  "notification.syncError": text("Toast title when a device sync fails."),
  "notification.syncErrorDetail": template(
    "Toast detail naming the device whose sync did not finish.",
    ["device"]
  ),
  "notification.deviceRefreshError": text(
    "Toast title when the device listing cannot be re-read."
  ),
  "notification.deviceRefreshErrorDetail": template(
    "Toast detail carrying the error from the device re-read.",
    ["error"]
  ),
  "notification.nothingWritten": template(
    "Toast title when a sync wrote nothing to the named device.",
    ["device"]
  ),
  "notification.tracksNotSynced": plural(
    "Toast title for tracks that were not synced.",
    ["count"]
  ),
  "notification.tracksSkippedDetail": plural(
    "Toast detail for tracks that could not be read.",
    ["count"]
  ),
  "notification.tracksNotFound": plural(
    "Toast title for tracks missing from the re-read device.",
    ["count", "device"]
  ),
  "notification.tracksUnverifiedDetail": plural(
    "Toast detail for tracks written but not found on the device.",
    ["count"]
  ),
  "notification.syncedTo": template(
    "Toast title naming the device a sync wrote to.",
    ["device"]
  ),
  "notification.tracksWritten": plural(
    "Toast detail for tracks written to the device.",
    ["count"]
  ),
  "notification.removeTracksError": text(
    "Toast title when removing tracks from a device fails."
  ),
  "notification.tracksRemoved": text(
    "Toast title after tracks are removed from a device."
  ),
  "notification.tracksRemovedDetail": plural(
    "Toast detail for tracks removed from the named device.",
    ["count", "device"]
  ),
  "notification.addDeviceError": text(
    "Toast title when adding a device fails."
  ),
  "notification.deviceNotAvailable": text(
    "Toast title when the device to sync is not connected."
  ),
  "notification.deviceNotAvailableDetail": template(
    "Toast detail naming the device that is no longer connected.",
    ["device"]
  ),
  "notification.syncStartError": text(
    "Toast title when a device sync cannot start."
  ),
  "notification.deviceAdded": text("Toast title after a device is added."),
  "notification.deviceAddedDetail": template(
    "Toast detail naming the device that connected.",
    ["device"]
  ),
  "notification.deviceAddError": text(
    "Toast title when adding a device raises an error."
  ),
} as const satisfies Record<string, ResourceDescriptor>;

// ---------------------------------------------------------------- derived
/** Every resource key (derived). */
export type WmmResourceKey = keyof typeof WMM_RESOURCES;

/** Keys whose resource is a positional template (derived). */
export type WmmTemplateKey = {
  [K in WmmResourceKey]: (typeof WMM_RESOURCES)[K] extends { kind: "template" }
    ? K
    : never;
}[WmmResourceKey];

/** Keys whose resource is a count-driven plural (derived). */
export type WmmPluralKey = {
  [K in WmmResourceKey]: (typeof WMM_RESOURCES)[K] extends { kind: "plural" }
    ? K
    : never;
}[WmmResourceKey];

/** Keys whose resource is fixed text (derived). */
export type WmmTextKey = Exclude<
  WmmResourceKey,
  WmmTemplateKey | WmmPluralKey
>;

/** A value that can fill a template placeholder. */
export type ResourceArg = string | number;

/** The positional arguments a template takes: one per declared param. */
export type TemplateArgs<K extends WmmTemplateKey> =
  (typeof WMM_RESOURCES)[K] extends { params: infer P extends readonly string[] }
    ? { readonly [I in keyof P]: ResourceArg }
    : never;

/**
 * The positional arguments a plural takes: the count first, then one per
 * remaining declared param.
 */
export type PluralArgs<K extends WmmPluralKey> =
  (typeof WMM_RESOURCES)[K] extends { params: infer P extends readonly string[] }
    ? { readonly [I in keyof P]: I extends "0" ? number : ResourceArg }
    : never;

/**
 * Rest-parameter shape for lookups: no arguments for text, exactly one
 * argument tuple for a template or a plural. `t("playback.next")`,
 * `t("playback.nowPlayingFormat", [artist, title])` and
 * `t("library.songCount", [count])` all type-check; mixing them up does not.
 */
export type ResourceArgs<K extends WmmResourceKey> = K extends WmmTemplateKey
  ? [args: TemplateArgs<K>]
  : K extends WmmPluralKey
    ? [args: PluralArgs<K>]
    : [];

/**
 * The shape a complete pack implements: exactly one string per key, and one
 * string per plural form. The default pack declares
 * `satisfies DefaultLanguagePack`, so a missing key, a missing English plural
 * form or an unknown key is a compile error; a CSV pack is partial and falls
 * back to the default language for a key it does not translate.
 */
export type LanguageResources = {
  readonly [K in WmmTextKey | WmmTemplateKey]: string;
} & {
  readonly [K in WmmPluralKey as `${K}${Capitalize<
    "one" | "other"
  >}`]: string;
} & {
  readonly [K in WmmPluralKey as `${K}${Capitalize<
    Exclude<PluralCategory, "one" | "other">
  >}`]?: string;
};

/** Runtime list of every key, in registry order (derived). */
export const WMM_RESOURCE_KEYS = Object.keys(WMM_RESOURCES) as WmmResourceKey[];

const KEY_SET: ReadonlySet<string> = new Set(WMM_RESOURCE_KEYS);

/** Type guard: is a name a known resource key? (theme validation boundary) */
export function isWmmResourceKey(name: string): name is WmmResourceKey {
  return KEY_SET.has(name);
}

/** Type guard: is a known key a template resource? */
export function isTemplateResource(key: WmmResourceKey): key is WmmTemplateKey {
  return WMM_RESOURCES[key].kind === "template";
}

/** Type guard: is a known key a count-driven plural? */
export function isPluralResource(key: WmmResourceKey): key is WmmPluralKey {
  return WMM_RESOURCES[key].kind === "plural";
}

/** The pack key that holds one plural category's text. */
export function pluralFormKey(
  base: WmmPluralKey,
  category: PluralCategory
): `${WmmPluralKey}${Capitalize<PluralCategory>}` {
  const suffix = category.charAt(0).toUpperCase() + category.slice(1);
  return `${base}${suffix}` as `${WmmPluralKey}${Capitalize<PluralCategory>}`;
}

/** The plural categories a language uses, in canonical order. */
export function getPluralCategories(language: string): PluralCategory[] {
  try {
    const used = new Intl.PluralRules(language).resolvedOptions()
      .pluralCategories;
    return PLURAL_CATEGORIES.filter((category) => used.includes(category));
  } catch {
    return ["one", "other"];
  }
}

/** Every pack key a language needs, in registry order, plurals expanded. */
export function getLanguagePackKeys(language: string): string[] {
  const categories = getPluralCategories(language);
  return WMM_RESOURCE_KEYS.flatMap((key) =>
    isPluralResource(key)
      ? categories.map((category) => pluralFormKey(key, category))
      : [key]
  );
}

export function getResourceDescriptor(key: WmmResourceKey): ResourceDescriptor {
  return WMM_RESOURCES[key];
}

/** The number of positional arguments a resource takes (0 for text). */
export function getResourceArity(key: WmmResourceKey): number {
  const descriptor: ResourceDescriptor = WMM_RESOURCES[key];
  return descriptor.kind === "text" ? 0 : descriptor.params.length;
}

export function getResourceNamespace(key: WmmResourceKey): WmmResourceNamespace {
  return key.slice(0, key.indexOf(".")) as WmmResourceNamespace;
}

// ----------------------------------------------------------- SDK manifest
/** One resource as published to theme tooling. */
export interface ResourceManifestEntry {
  key: WmmResourceKey;
  namespace: WmmResourceNamespace;
  kind: ResourceDescriptor["kind"];
  description: string;
  params: readonly string[];
}

/**
 * The resource half of the future Theme SDK manifest: plain JSON-safe data
 * that tooling can merge with `WMM_COMMAND_NAMES` and `WMM_EVENT_NAMES`.
 */
export function exportResourceManifest(): ResourceManifestEntry[] {
  return WMM_RESOURCE_KEYS.map((key) => {
    const descriptor: ResourceDescriptor = WMM_RESOURCES[key];
    return {
      key,
      namespace: getResourceNamespace(key),
      kind: descriptor.kind,
      description: descriptor.description,
      params: descriptor.kind === "text" ? [] : [...descriptor.params],
    };
  });
}
