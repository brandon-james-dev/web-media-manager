import { useEffect, useMemo, useState } from "react";
import { useSongs } from "@/hooks";
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
} from "lucide-react";
import { cn } from "cn";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ItemGroup } from "@/components/ui/item";
import { SongContextMenu } from "@/components/song-context-menu";
import { TrackItem } from "@/components/track-item";
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
  const { filteredSongs } = useSongs();
  const { setQuery } = useSongs();
  const { setSort, activeMode } = useOutletContext<MainContext>();
  const artistSort = useMemo(() => ({ selector: (song: Song) => song.artist, desc: false }), []);
  const [nowPlayingSongId, setNowPlayingSongId] = useState<string>();
  const [selectedArtistId, setSelectedArtistId] = useState<string>(ALL_ARTISTS);
  const [sortDesc, setSortDesc] = useState(false);
  const isMobile = useIsMobile();
  // Mobile shows one column at a time (artist list -> artist detail), so an
  // explicit "show the list" flag decides which column is visible.
  const [mobileShowingList, setMobileShowingList] = useState(true);
  //#endregion

  //#region Helpers
  useEffect(() => {
    setQuery({ sort: artistSort });
    setSort(artistSort);
  }, [setQuery, setSort, artistSort]);

  const artists = useMemo(() => {
    const map = new Map<string, Artist>();

    for (const song of filteredSongs) {
      const name = song.artist || "Unknown Artist";
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
        const title = song.album || "Unknown Album";
        const key = `${title}-${artist.name}`;
        const existing = albumMap.get(key);
        if (existing) {
          existing.songs.push(song);
          // Prefer a track that carries artwork for the album art lookup.
          const current = existing.songs.find((s) => s.id === existing.pictureSongId);
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

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredSongs]);

  // The "All Artists" entry is selected by default (and by its sentinel id);
  // a real artist id switches the right pane to the detail column.
  const isAllArtists = selectedArtistId === ALL_ARTISTS;
  const selectedArtist = isAllArtists ? undefined : artists.find((a) => a.id === selectedArtistId);

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
  const detailAlbums = isAllArtists ? allAlbums : (selectedArtist?.albums ?? []);
  const detailSongs = isAllArtists
    ? allAlbums.flatMap((a) => a.songs)
    : (selectedArtist?.songs ?? []);
  const detailName = isAllArtists ? "All Artists" : (selectedArtist?.name ?? "");

  // Apply the A–Z / Z–A toggle to the artist list order.
  const orderedArtists = useMemo(
    () => (sortDesc ? [...artists].reverse() : artists),
    [artists, sortDesc],
  );
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
    wmmBus.invoke("wmm.playback.playQueue", {
      songIds: album.songs.map((s) => s.id),
    });
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

  function quickEditSong(song: Song) {
    // Edit mode single-click: publish the selection — the editor dock shows
    // the quick edit panel for selected songs (same affordance as the
    // context menu's Quick Edit flow).
    wmmBus.publish("wmm.ui.selectionChanged", { songIds: [song.id] });
  }

  function playSongs(songs: Song[]) {
    const ids = songs.map((s) => s.id);
    if (!ids.length) return;
    wmmBus.invoke("wmm.playback.playQueue", { songIds: ids });
    wmmBus.invoke("wmm.playback.playSong", { songId: ids[0] });
  }

  function shuffleSongs(songs: Song[]) {
    const ids = songs.map((s) => s.id);
    if (ids.length) wmmBus.invoke("wmm.playback.playQueue", { songIds: ids });
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
  //#endregion

  return (
    <div className="h-full w-full flex">
      {/* Mobile shows one column at a time; desktop keeps both panes. */}
      <div
        className={cn(
          "shrink-0 border-r flex flex-col min-h-0",
          isMobile ? "w-full" : "w-60",
          isMobile && !mobileShowingList && "hidden"
        )}
      >
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div>
            <div className="font-bold">Artists</div>
            <div className="text-xs text-muted-foreground">
              {artists.length} {artists.length === 1 ? "artist" : "artists"}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDesc(!sortDesc)}
            title="Toggle A-Z / Z-A"
          >
            {sortDesc ? <ArrowUpAZ /> : <ArrowDownAZ />}
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="py-1">
            <SongContextMenu songs={filteredSongs}>
              <button
                onClick={() => {
                  setSelectedArtistId(ALL_ARTISTS);
                  setMobileShowingList(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md transition-colors",
                  isAllArtists
                    ? "bg-accent/15 text-foreground"
                    : "text-muted-foreground hover:bg-accent/10",
                )}
              >
                <div
                  className="relative w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white"
                  style={{
                    background: "linear-gradient(135deg, hsl(0 0% 45%), hsl(0 0% 28%))",
                  }}
                >
                  <Users size={18} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">All Artists</div>
                  <div className="text-xs text-muted-foreground">
                    {artists.length} {artists.length === 1 ? "artist" : "artists"}
                  </div>
                </div>
              </button>
            </SongContextMenu>

            {orderedArtists.map((a) => (
              <SongContextMenu key={a.id} songs={a.songs}>
                <button
                  onClick={() => {
                    setSelectedArtistId(a.id);
                    setMobileShowingList(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md transition-colors",
                    a.id === selectedArtist?.id
                      ? "bg-accent/15 text-foreground"
                      : "text-muted-foreground hover:bg-accent/10",
                  )}
                >
                  <div
                    className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: artistGradient(a.name) }}
                  >
                    {artistInitials(a.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.albums.length} {a.albums.length === 1 ? "album" : "albums"}
                    </div>
                  </div>
                </button>
              </SongContextMenu>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div
        className={cn(
          "flex-1 flex flex-col min-h-0 min-w-0",
          isMobile && mobileShowingList && "hidden"
        )}
      >
        {/* Name/details (as in the master list) above the album groupings */}
        <div className={cn("shrink-0", isMobile ? "px-3 pt-3 pb-2" : "px-5 pt-4 pb-2")}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {isMobile && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  aria-label="Back to artists"
                  onClick={() => setMobileShowingList(true)}
                >
                  <ChevronLeft />
                </Button>
              )}
              <div className={cn("truncate font-bold", isMobile ? "text-xl" : "text-3xl")}>
                {detailName}
              </div>
            </div>
            {activeMode !== "edit" && detailSongs.length > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  title="Play all"
                  onClick={() => playSongs(detailSongs)}
                >
                  <Play className="fill-current" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Shuffle"
                  onClick={() => shuffleSongs(detailSongs)}
                >
                  <Shuffle />
                </Button>
                <MoreActionsButton
                  items={[
                    { label: "Play all", onClick: () => playSongs(detailSongs) },
                    { label: "Shuffle", onClick: () => shuffleSongs(detailSongs) },
                  ]}
                />
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {detailAlbums.length} {detailAlbums.length === 1 ? "album" : "albums"}
            {" · "}
            {detailSongs.length} {detailSongs.length === 1 ? "song" : "songs"}
          </div>
        </div>

        {/* Album sections: art → sticky title row → songs underneath */}
        <ScrollArea className="flex-1 min-h-0">
          <div className={cn("pb-6", isMobile ? "px-3" : "px-5")}>
            {detailAlbums.map((album) => (
              <AlbumSection
                key={album.id}
                album={album}
                isMobile={isMobile}
                activeMode={activeMode}
                nowPlayingSongId={nowPlayingSongId}
                onPlay={() => playAlbum(album)}
                onShuffle={() => shuffleAlbum(album)}
                onEdit={() => editAlbum(album)}
                onEditSong={editSong}
                onQuickEditSong={quickEditSong}
                onArtDoubleClick={() => handleAlbumArtDoubleClick(album)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

//#region Piece components
function AlbumSection({
  album,
  isMobile = false,
  activeMode,
  nowPlayingSongId,
  onPlay,
  onShuffle,
  onEdit,
  onEditSong,
  onQuickEditSong,
  onArtDoubleClick,
}: {
  album: Album;
  /** Narrow screen: smaller artwork, so the title row keeps usable width. */
  isMobile?: boolean;
  activeMode: string | undefined;
  nowPlayingSongId: string | undefined;
  onPlay: () => void;
  onShuffle: () => void;
  onEdit: () => void;
  /** Edit a single song (double-click / per-track action in edit mode). */
  onEditSong: (song: Song) => void;
  onQuickEditSong: (song: Song) => void;
  /** Double-click the art: play the album (edit mode: open the album editor). */
  onArtDoubleClick: () => void;
}) {
  const songs = trackSorted(album);
  const meta = [albumGenre(album), albumYear(album)]
    .filter((v) => v !== undefined && v !== null && v !== "")
    .join(" · ");

  return (
    <section className="mt-4">
      <SongContextMenu songs={album.songs}>
        <div className="contents">
          <div
            className={cn("w-44", isMobile && "w-32 self-start")}
            onDoubleClick={onArtDoubleClick}
            title="Play album"
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
                    <div className="text-xs px-2 text-white">{album.artist}</div>
                  </div>
                }
              />
            </div>
          </div>

          <div className="sticky top-0 z-10 bg-background py-2 flex items-end gap-3">
            <div className="flex-1 min-w-0">
              <div className="truncate text-xl font-bold">{album.title}</div>
              <div className="text-sm text-muted-foreground truncate">{meta || album.artist}</div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {activeMode === "edit" ? (
                <Button size="icon" variant="ghost" title="Edit album" onClick={onEdit}>
                  <Pencil />
                </Button>
              ) : (
                <>
                  <Button size="icon" variant="ghost" title="Play" onClick={onPlay}>
                    <Play className="fill-current" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Shuffle" onClick={onShuffle}>
                    <Shuffle />
                  </Button>
                </>
              )}
              <MoreActionsButton
                items={
                  activeMode === "edit"
                    ? [{ label: "Edit album", onClick: onEdit }]
                    : [
                        { label: "Play album", onClick: onPlay },
                        { label: "Shuffle album", onClick: onShuffle },
                      ]
                }
              />
            </div>
          </div>
        </div>
      </SongContextMenu>

      <ItemGroup className="mt-1 gap-0! has-data-[size=sm]:gap-0! has-data-[size=xs]:gap-0! divide-y divide-border">
        {songs.map((song, i) => (
          <div key={song.id}>
            <TrackItem
              song={song}
              index={i}
              size="sm"
              showMeta={false}
              isPlaying={nowPlayingSongId === song.id}
              // Playback mode: tap/click plays. Edit mode: the row isn't a
              // play affordance — double-click opens that song's editor.
              onPlay={
                activeMode === "edit"
                  ? undefined
                  : () => {
                      wmmBus.invoke("wmm.playback.playQueue", {
                        songIds: songs.map((s) => s.id),
                      });
                      wmmBus.invoke("wmm.playback.playSong", { songId: song.id });
                    }
              }
              onClick={activeMode === "edit" ? () => onQuickEditSong(song) : undefined}
              onDoubleClick={activeMode === "edit" ? () => onEditSong(song) : undefined}
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center justify-center rounded-md w-7 h-7",
          "hover:text-foreground hover:bg-accent/15 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        title="More actions"
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
