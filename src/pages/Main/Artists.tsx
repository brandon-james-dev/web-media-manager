import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlphabetScrubber } from "@/components/alphabet-scrubber";
import { buildLetterIndex, scrollListToIndex } from "@/lib/alphabet";
import { useShufflePlay, useSourceSongs, useSongs } from "@/hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOutletContext } from "react-router";
import type { Album, Artist, Song } from "@/models";
import type { MainContext } from "./MainLayout";
import { wmmBus } from "@/events";
import { AlbumArtImage } from "@/components/album-art-image";
import { ThumbnailSize } from "@/lib";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Shuffle,
  Pencil,
  MoreHorizontal,
  ArrowDownAZ,
  ArrowUpAZ,
  Users,
  ChevronLeft,
  X,
} from "lucide-react";
import { cn } from "cn";
import { useDetailPane } from "@/lib/router/useDetailPane";
import { useIsCompact, useIsMobile } from "@/hooks/useIsMobile";
import { ItemGroup } from "@/components/ui/item";
import { SongContextMenu } from "@/components/song-context-menu";
import { TrackItem } from "@/components/track-item";
import { DraggableSongs } from "@/components/library-sidebar";
import { useTranslation } from "@/i18n";
import {
  albumGenre,
  albumPictureSong,
  albumYear,
  trackSorted,
} from "@/lib/albums/albumDisplay";

const ALL_ARTISTS = "__all_artists__";

/**
 * Artists page — stacked artist detail view.
 *
 * Left pane: the "All Artists" entry above the artist list (the only
 * selection). Right pane: All Artists shows the full artist grid; a selected
 * artist shows one continuous column — the artist header, then each album
 * stacked vertically as art → title/meta row (sticky while its section
 * scrolls) → that album's songs underneath the art. Action affordances follow
 * the editor mode (playback: Play/Shuffle; edit: Edit).
 */
export function Artists() {
  //#region State
  const { t } = useTranslation();
  const { filteredSongs } = useSongs();
  const { setQuery } = useSongs();
  const { setSort, activeMode, selectedSourceIds } =
    useOutletContext<MainContext>();
  const artistSort = useMemo(
    () => ({ selector: (song: Song) => song.artist, desc: false }),
    []
  );
  const [nowPlayingSongId, setNowPlayingSongId] = useState<string>();
  const [selectedArtistId, setSelectedArtistId] = useState<string>(ALL_ARTISTS);
  // Songs picked in edit mode, so several can be deselected at once.
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [sortDesc, setSortDesc] = useState(false);
  const shufflePlay = useShufflePlay();
  const isCompact = useIsCompact();
  // Only phones collapse to a single pane; a tablet has room for the artist
  // list beside the detail.
  const isMobile = useIsMobile();
  // Mobile shows one column at a time (artist list -> artist detail), so an
  // explicit "show the list" flag decides which column is visible.
  const [mobileShowingList, setMobileShowingList] = useDetailPane();
  //#endregion

  //#region Helpers
  useEffect(() => {
    // Keep the rest of the query (the search filter) so a mode switch does
    // not clear it.
    setQuery((prev) => ({ ...prev, sort: artistSort }));
    setSort(artistSort);
  }, [setQuery, setSort, artistSort]);

  // Source chips narrow the already-filtered list; an empty selection keeps
  // every song. A selected sync device contributes its on-device tracks,
  // which are never imported into the library.
  const deviceSongs = useSourceSongs(selectedSourceIds);
  const visibleSongs = useMemo(() => {
    const base =
      selectedSourceIds.length === 0
        ? filteredSongs
        : filteredSongs.filter((song) =>
          selectedSourceIds.includes(song.sourceId)
        );
    return deviceSongs.length === 0 ? base : [...base, ...deviceSongs];
  }, [filteredSongs, selectedSourceIds, deviceSongs]);

  const artists = useMemo(() => {
    const map = new Map<string, Artist>();

    for (const song of visibleSongs) {
      const name = song.artist || t("common.unknownArtist");
      let artist = map.get(name);
      if (!artist) {
        artist = { id: name, name, songs: [], albums: [] };
        map.set(name, artist);
      }
      artist.songs.push(song);
    }

    // Group each artist's songs into albums (title + artist).
    for (const artist of map.values()) {
      const albumMap = new Map<string, Album>();
      for (const song of artist.songs) {
        const title = song.album || t("library.unknownAlbum");
        const key = `${title}-${artist.name}`;
        const existing = albumMap.get(key);
        if (existing) {
          existing.songs.push(song);
          // Prefer a track that carries artwork for the album art lookup.
          const current = existing.songs.find(
            (s) => s.id === existing.pictureSongId
          );
          if (!current?.pictures?.length && song.pictures?.length) {
            existing.pictureSongId = song.id;
          }
        } else {
          albumMap.set(key, {
            id: key,
            title,
            artist: artist.name,
            pictureSongId: song.id,
            songs: [song],
          });
        }
      }
      // Newest first (max year desc), then title asc.
      artist.albums = Array.from(albumMap.values()).sort((a, b) => {
        const ya = albumYear(a) ?? 0;
        const yb = albumYear(b) ?? 0;
        if (yb !== ya) return yb - ya;
        return a.title.localeCompare(b.title);
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [visibleSongs, t]);

  // The "All Artists" entry is selected by default (and by its sentinel id);
  // a real artist id switches the right pane to the detail column.
  // When a filter removes the selected artist, fall back to All Artists
  // instead of leaving the detail pane blank.
  const selectedArtist =
    selectedArtistId === ALL_ARTISTS
      ? undefined
      : artists.find((a) => a.id === selectedArtistId);
  const isAllArtists = !selectedArtist;

  // All Artists view: every album in the library, newest first (per-artist
  // album lists are already year-sorted; re-sort globally for the grid).
  const allAlbums = useMemo(() => {
    const list = artists.flatMap((a) => a.albums);
    return list.sort((x, y) => {
      const xy = albumYear(x) ?? 0;
      const yy = albumYear(y) ?? 0;
      if (yy !== xy) return yy - xy;
      return x.title.localeCompare(y.title);
    });
  }, [artists]);

  // What the detail column renders. Both branches share one display: the
  // album sections (art → sticky title row → songs) plus the header
  // play/shuffle affordances. All Artists feeds in the whole library's
  // albums/songs; a selected artist feeds in its own.
  const detailAlbums = useMemo(
    () => (isAllArtists ? allAlbums : (selectedArtist?.albums ?? [])),
    [isAllArtists, allAlbums, selectedArtist]
  );
  const detailSongs = useMemo(
    () =>
      isAllArtists
        ? allAlbums.flatMap((a) => a.songs)
        : (selectedArtist?.songs ?? []),
    [isAllArtists, allAlbums, selectedArtist]
  );
  const detailName = isAllArtists
    ? t("library.allArtists")
    : (selectedArtist?.name ?? "");

  // Apply the A–Z / Z–A toggle to the artist list order.
  const orderedArtists = useMemo(
    () => (sortDesc ? [...artists].reverse() : artists),
    [artists, sortDesc]
  );

  const artistListRef = useRef<HTMLDivElement>(null);
  const artistLetterIndex = useMemo(
    () => buildLetterIndex(orderedArtists.map((a) => a.name)),
    [orderedArtists]
  );
  const artistLetters = useMemo(
    () => new Set(artistLetterIndex.keys()),
    [artistLetterIndex]
  );

  // All Artists groups albums under each artist (in the list's A–Z / Z–A
  // order) so a sticky artist header can label them; a single artist needs
  // no extra header.
  const albumGroups = useMemo(
    () =>
      isAllArtists
        ? orderedArtists
          .filter((a) => a.albums.length > 0)
          .map((a) => ({ key: a.id, artistName: a.name, albums: a.albums }))
        : [{ key: "single", artistName: undefined, albums: detailAlbums }],
    [isAllArtists, orderedArtists, detailAlbums]
  );

  const detailListRef = useRef<HTMLDivElement>(null);
  const detailContentRef = useRef<HTMLDivElement>(null);
  const groupLetterIndex = useMemo(
    () =>
      isAllArtists
        ? buildLetterIndex(albumGroups.map((g) => g.artistName))
        : new Map<string, number>(),
    [isAllArtists, albumGroups]
  );
  const groupLetters = useMemo(
    () => new Set(groupLetterIndex.keys()),
    [groupLetterIndex]
  );

  /**
   * All Artists mounts one section per album in the library, which on a large
   * collection is thousands of rows and tens of thousands of DOM nodes — the
   * whole library rendered before the first paint. Only the artist groups
   * around the viewport are mounted here; the rest are positioned from their
   * measured height, so scrolling and the alphabet scrubber stay exact.
   *
   * A single artist keeps the plain list: one group is bounded by that
   * artist's own catalogue and virtualization would only add measurement.
   */
  // The virtualizer returns functions React Compiler cannot memoize, so it
  // skips this component by design; the virtualizer owns that state itself.
  // eslint-disable-next-line react-hooks/incompatible-library
  const groupVirtualizer = useVirtualizer({
    count: isAllArtists ? albumGroups.length : 0,
    getScrollElement: () =>
      detailContentRef.current?.closest<HTMLElement>(
        '[data-slot="scroll-area-viewport"]'
      ) ?? null,
    estimateSize: () => 900,
    overscan: 2,
    getItemKey: (index) => albumGroups[index]?.key ?? index,
    measureElement: (el) => el.getBoundingClientRect().height,
  });
  //#endregion

  //#region Interactivity handlers
  function playAlbum(album: Album) {
    const ids = album.songs.map((s) => s.id);
    if (!ids.length) return;
    wmmBus.invoke("wmm.playback.playQueue", { songIds: ids });
    wmmBus.invoke("wmm.playback.playSong", {
      songId: trackSorted(album)[0]?.id ?? ids[0],
    });
  }

  function shuffleAlbum(album: Album) {
    shufflePlay(album.songs.map((s) => s.id));
  }

  function editAlbum(album: Album) {
    // Album double-click/action → the album's advanced editor. Carries a
    // song id so the Editor resolves its own album grouping.
    const first = trackSorted(album)[0] ?? album.songs[0];
    if (first) {
      wmmBus.invoke("wmm.library.album.edit", { songId: first.id });
    }
  }

  function editSong(song: Song) {
    // Song double-click/action → that song's advanced editor.
    wmmBus.invoke("wmm.library.song.edit", { songId: song.id });
  }

  function toggleSongSelection(song: Song) {
    // Edit mode single-click: add or remove the song from the selection. The
    // selection is published by the effect below, not from inside the updater.
    setSelectedSongIds((current) =>
      current.includes(song.id)
        ? current.filter((id) => id !== song.id)
        : [...current, song.id]
    );
  }

  function deselectSongs() {
    setSelectedSongIds([]);
  }

  function playSongs(songs: Song[]) {
    const ids = songs.map((s) => s.id);
    if (!ids.length) return;
    wmmBus.invoke("wmm.playback.playQueue", { songIds: ids });
    wmmBus.invoke("wmm.playback.playSong", { songId: ids[0] });
  }

  function shuffleSongs(songs: Song[]) {
    shufflePlay(songs.map((s) => s.id));
  }

  function handleAlbumArtDoubleClick(album: Album) {
    if (activeMode === "edit") {
      editAlbum(album);
      return;
    }
    // Double-click plays the album; single click selects nothing and shows
    // no state, matching the track rows.
    playAlbum(album);
  }
  //#endregion

  //#region Global event handlers
  useEffect(() => {
    const playbackSub = wmmBus.on("wmm.playback.started", (payload) => {
      if (payload?.songId) setNowPlayingSongId(payload.songId);
    });

    return () => {
      playbackSub();
    };
  }, []);

  // The editor dock follows the picks; publishing from an effect keeps the
  // state updater pure.
  useEffect(() => {
    wmmBus.publish("wmm.ui.selectionChanged", { songIds: selectedSongIds });
  }, [selectedSongIds]);
  //#endregion

  // One artist group: its sticky header (All Artists only) and each album
  // section. Shared by the virtualized All Artists list and the plain
  // single-artist list so both render identically.
  const renderGroup = (artistName: string | undefined, albums: Album[]) => (
    <>
      {artistName && (
        <div className="sticky top-0 z-raised flex h-10 items-center truncate bg-background text-sm font-bold uppercase tracking-wide text-primary">
          {artistName}
        </div>
      )}
      {albums.map((album) => (
        <AlbumSection
          key={album.id}
          album={album}
          stickyTop={artistName ? "top-10" : "top-0"}
          isCompact={isCompact}
          activeMode={activeMode}
          nowPlayingSongId={nowPlayingSongId}
          onPlay={() => playAlbum(album)}
          onShuffle={() => shuffleAlbum(album)}
          onEdit={() => editAlbum(album)}
          onEditSong={editSong}
          onToggleSong={toggleSongSelection}
          selectedSongIds={selectedSongIds}
          onArtDoubleClick={() => handleAlbumArtDoubleClick(album)}
        />
      ))}
    </>
  );

  return (
    <div className="h-full w-full flex">
      <div
        className={cn(
          "shrink-0 border-r flex flex-col min-h-0",
          isMobile ? "w-full" : "w-60",
          isMobile && !mobileShowingList && "hidden"
        )}
      >
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div>
            <div className="font-bold">{t("library.artists")}</div>
            <div className="text-xs text-muted-foreground">
              {t("library.artistCount", [artists.length])}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDesc(!sortDesc)}
            title={t("library.toggleSortOrder")}
          >
            {sortDesc ? <ArrowUpAZ /> : <ArrowDownAZ />}
          </Button>
        </div>

        <div className="relative flex-1 min-h-0">
          <ScrollArea ref={artistListRef} className="h-full">
            <div className="py-1">
              <SongContextMenu songs={visibleSongs}>
                <button
                  onClick={() => {
                    setSelectedArtistId(ALL_ARTISTS);
                    setMobileShowingList(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md transition-colors",
                    isAllArtists
                      ? "bg-accent/15 text-foreground"
                      : "text-muted-foreground hover:bg-accent/10"
                  )}
                >
                  <div
                    className="relative w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, hsl(0 0% 45%), hsl(0 0% 28%))",
                    }}
                  >
                    <Users size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {t("library.allArtists")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("library.artistCount", [artists.length])}
                    </div>
                  </div>
                </button>
              </SongContextMenu>

              {orderedArtists.map((a) => (
                <DraggableSongs
                  key={a.id}
                  dragId={`artist:${a.id}`}
                  label={a.name}
                  sublabel={
                    t("library.albumCount", [a.albums.length])
                  }
                  songIds={a.songs.map((song) => song.id)}
                >
                  {/* The menu wraps the button, not the drag wrapper: the
                      trigger hands its handlers to its child, and a custom
                      component would drop them. */}
                  <SongContextMenu songs={a.songs}>
                    <button
                    onClick={() => {
                      setSelectedArtistId(a.id);
                      setMobileShowingList(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md transition-colors",
                      a.id === selectedArtist?.id
                        ? "bg-accent/15 text-foreground"
                        : "text-muted-foreground hover:bg-accent/10"
                    )}
                  >
                    <div
                      className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: artistGradient(a.name) }}
                    >
                      {artistInitials(a.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {a.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("library.albumCount", [a.albums.length])}
                      </div>
                    </div>
                  </button>
                  </SongContextMenu>
                </DraggableSongs>
              ))}
            </div>
          </ScrollArea>
          {artistLetterIndex.size > 0 && (
            <AlphabetScrubber
              availableLetters={artistLetters}
              reversed={sortDesc}
              autoHide={isCompact}
              hoverOnly={!isCompact}
              scrollRef={artistListRef}
              onSelect={(letter) =>
                scrollListToIndex(
                  artistListRef.current,
                  (artistLetterIndex.get(letter) ?? 0) + 1,
                  orderedArtists.length + 1
                )
              }
            />
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex-1 flex flex-col min-h-0 min-w-0",
          isMobile && mobileShowingList && "hidden"
        )}
      >
        <div
          className={cn(
            "shrink-0",
            isCompact ? "px-3 pt-3 pb-2" : "px-5 pt-4 pb-2"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {isMobile && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  aria-label={t("library.backToArtists")}
                  onClick={() => setMobileShowingList(true)}
                >
                  <ChevronLeft />
                </Button>
              )}
              <div
                className={cn(
                  "truncate font-bold",
                  isCompact ? "text-xl" : "text-3xl"
                )}
              >
                {detailName}
              </div>
            </div>
            {activeMode !== "edit" && detailSongs.length > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  title={t("playback.playAll")}
                  onClick={() => playSongs(detailSongs)}
                >
                  <Play className="fill-current" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title={t("playback.shuffle")}
                  onClick={() => shuffleSongs(detailSongs)}
                >
                  <Shuffle />
                </Button>
                <MoreActionsButton
                  items={[
                    {
                      label: t("playback.playAll"),
                      onClick: () => playSongs(detailSongs),
                    },
                    {
                      label: t("playback.shuffle"),
                      onClick: () => shuffleSongs(detailSongs),
                    },
                  ]}
                />
              </div>
            )}
            {activeMode === "edit" && selectedSongIds.length > 1 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 gap-1 px-2 text-xs"
                title={t("library.deselectAll")}
                aria-label={t("library.deselectAllSongs")}
                onClick={deselectSongs}
              >
                <X />
                {t("library.deselectCount", [selectedSongIds.length])}
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {t("library.albumCount", [detailAlbums.length])}
            {" · "}
            {t("library.songCount", [detailSongs.length])}
          </div>
        </div>

        <div className="relative flex-1 min-h-0">
          <ScrollArea ref={detailListRef} className="h-full">
            <div
              ref={detailContentRef}
              className={cn("pb-6", isCompact ? "px-3" : "px-5")}
            >
              {isAllArtists ? (
                <div
                  className="relative"
                  style={{ height: groupVirtualizer.getTotalSize() }}
                >
                  {groupVirtualizer.getVirtualItems().map((virtualGroup) => {
                    const group = albumGroups[virtualGroup.index];
                    if (!group) return null;

                    return (
                      <div
                        key={virtualGroup.key}
                        ref={groupVirtualizer.measureElement}
                        data-index={virtualGroup.index}
                        className="absolute top-0 left-0 w-full"
                        style={{
                          top: virtualGroup.start,
                        }}
                      >
                        {renderGroup(group.artistName, group.albums)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                albumGroups.map(({ key, artistName, albums }) => (
                  <div key={key}>{renderGroup(artistName, albums)}</div>
                ))
              )}
            </div>
          </ScrollArea>
          {isAllArtists && groupLetterIndex.size > 0 && (
            <AlphabetScrubber
              availableLetters={groupLetters}
              reversed={sortDesc}
              className={isCompact ? "right-0" : "right-3"}
              autoHide={isCompact}
              hoverOnly={!isCompact}
              scrollRef={detailListRef}
              onSelect={(letter) =>
                groupVirtualizer.scrollToIndex(
                  groupLetterIndex.get(letter) ?? 0,
                  { align: "start" }
                )
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

//#region Piece components
function AlbumSection({
  album,
  stickyTop = "top-0",
  isCompact = false,
  activeMode,
  nowPlayingSongId,
  onPlay,
  onShuffle,
  onEdit,
  onEditSong,
  onToggleSong,
  selectedSongIds,
  onArtDoubleClick,
}: {
  album: Album;
  /** Narrow screen: smaller artwork, so the title row keeps usable width. */
  /** Sticky offset class for the title row (below an artist header when grouped). */
  stickyTop?: string;
  isCompact?: boolean;
  activeMode: string | undefined;
  nowPlayingSongId: string | undefined;
  onPlay: () => void;
  onShuffle: () => void;
  onEdit: () => void;
  /** Edit a single song (double-click / per-track action in edit mode). */
  onEditSong: (song: Song) => void;
  /** Edit mode single-click: add or remove this song from the selection. */
  onToggleSong: (song: Song) => void;
  /** Songs currently picked in edit mode. */
  selectedSongIds: string[];
  /** Double-click the art: play the album (edit mode: open the album editor). */
  onArtDoubleClick: () => void;
}) {
  const { t } = useTranslation();
  const songs = trackSorted(album);
  const meta = [albumGenre(album), albumYear(album)]
    .filter((v) => v !== undefined && v !== null && v !== "")
    .join(" · ");

  /** Play this album's queue starting at `song`. */
  function playSong(song: Song) {
    wmmBus.invoke("wmm.playback.playQueue", {
      songIds: songs.map((s) => s.id),
    });
    wmmBus.invoke("wmm.playback.playSong", { songId: song.id });
  }

  return (
    <section className="mt-4">
      <SongContextMenu songs={album.songs}>
        <div className="contents">
          <div
            className={cn("w-44", isCompact && "w-32 self-start")}
            onDoubleClick={onArtDoubleClick}
            title={t("playback.playAlbum")}
          >
            <div className="aspect-square rounded-lg overflow-hidden border bg-muted shadow-sm">
              <AlbumArtImage
                songId={album.pictureSongId ?? albumPictureSong(album)?.id}
                thumbSize={ThumbnailSize.thumb512}
                className="w-full h-full object-cover"
                fallback={
                  <div
                    className="w-full h-full flex flex-col items-center justify-center text-center"
                    style={{ background: artistGradient(album.title) }}
                  >
                    <div className="font-semibold text-[13px] truncate px-2 text-white">
                      {album.title}
                    </div>
                    <div className="text-xs px-2 text-white">
                      {album.artist}
                    </div>
                  </div>
                }
              />
            </div>
          </div>

          <div
            className={cn(
              "sticky z-sticky bg-background py-2 flex items-end gap-3",
              stickyTop
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="truncate text-xl font-bold">{album.title}</div>
              <div className="text-sm text-muted-foreground truncate">
                {meta || album.artist}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {activeMode === "edit" ? (
                <Button
                  size="icon"
                  variant="ghost"
                  title={t("library.editAlbum")}
                  onClick={onEdit}
                >
                  <Pencil />
                </Button>
              ) : (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={t("playback.play")}
                    onClick={onPlay}
                  >
                    <Play className="fill-current" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={t("playback.shuffle")}
                    onClick={onShuffle}
                  >
                    <Shuffle />
                  </Button>
                </>
              )}
              <MoreActionsButton
                items={
                  activeMode === "edit"
                    ? [{ label: t("library.editAlbum"), onClick: onEdit }]
                    : [
                      { label: t("playback.playAlbum"), onClick: onPlay },
                      {
                        label: t("playback.shuffleAlbum"),
                        onClick: onShuffle,
                      },
                    ]
                }
              />
            </div>
          </div>
        </div>
      </SongContextMenu>

      <ItemGroup
        className={cn(
          "mt-1 gap-0! has-data-[size=sm]:gap-0! has-data-[size=xs]:gap-0! divide-y divide-border",
          // The right inset reserves room for the A-Z scrubber, which only
          // overlays the list on wide layouts. On compact it just made the
          // rows stop short of the album's action buttons above them.
          isCompact ? "pr-0" : "pr-7"
        )}
      >
        {songs.map((song, i) => (
          <div key={song.id}>
            <TrackItem
              song={song}
              index={i}
              size="sm"
              showMeta={false}
              menuSongs={album.songs}
              isPlaying={nowPlayingSongId === song.id}
              // Playback mode: tap/click plays. Edit mode: the row isn't a
              // play affordance — double-click opens that song's editor.
              // Compact (phone/tablet) has no hover and no double-tap, so a
              // single tap plays there; desktop keeps double-click.
              onPlay={activeMode === "edit" ? undefined : () => playSong(song)}
              onClick={
                activeMode === "edit"
                  ? () => onToggleSong(song)
                  : isCompact
                    ? () => playSong(song)
                    : undefined
              }
              onDoubleClick={
                activeMode === "edit"
                  ? () => onEditSong(song)
                  : isCompact
                    ? undefined
                    : () => playSong(song)
              }
              className={cn(
                selectedSongIds.includes(song.id) &&
                  "bg-primary/15 hover:bg-primary/20"
              )}
            />
          </div>
        ))}
      </ItemGroup>
    </section>
  );
}

function MoreActionsButton({
  items,
  className,
}: {
  items: Array<{ label: string; onClick: () => void }>;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center justify-center rounded-md w-7 h-7",
          "hover:text-foreground hover:bg-accent/15 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        title={t("common.moreActions")}
      >
        <MoreHorizontal size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onSelect={() => {
              item.onClick();
            }}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
//#endregion

//#region Detail helpers
// trackSorted / albumPictureSong / albumGenre / albumYear come from the
// shared `lib/albums/albumDisplay` module (also used by AlbumCard's modal).

/** Deterministic per-artist/album gradient (kept from the earlier design). */
function artistGradient(name: string): string {
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 70% 35%))`;
}

function artistInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
//#endregion
