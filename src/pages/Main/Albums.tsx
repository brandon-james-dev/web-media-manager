import { useEffect, useMemo, useState } from "react";
import { useSongs } from "@/hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlbumCard } from "@/components/album-card";
import { useOutletContext } from "react-router";
import type { Album, Song } from "@/models";
import type { MainContext } from "./MainLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  GalleryHorizontal,
  Grid2x2,
} from "lucide-react";
import { useIsCompact } from "@/lib/hooks/useIsMobile";
import { wmmBus } from "@/events";
import { TanstackSongTable } from "@/components/song-table";
import { CoverFlow, type CoverFlowItem } from "@/components/ui/CoverFlow";
import { AlbumArtImage } from "@/components/album-art-image";
import { ThumbnailSize } from "@/lib";
import { AlbumDetailModal } from "@/components/album-modal";

export function Albums() {
  //#region State
  const isCompact = useIsCompact();
  const { filteredSongs } = useSongs();
  const { setQuery } = useSongs();
  const { setSort, activeMode, selectedSourceIds } =
    useOutletContext<MainContext>();
  const [albumSort] = useState<{
    selector: (song: Song) => void;
    desc: boolean;
  }>({
    selector: (song: Song) => song.album,
    desc: false,
  });
  const [nowPlayingSongId, setNowPlayingSongId] = useState<string>();
  const [selectedAlbumIndex, setSelectedAlbumIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"grid" | "coverflow">("grid");
  // Playback-mode album modal (single click). Edit mode keeps selecting the
  // album's songs for the editor dock instead.
  const [albumModal, setAlbumModal] = useState<Album | undefined>();
  const [sortField, setSortField] = useState<"album" | "artist">("album");
  const [sortDesc, setSortDesc] = useState<boolean>(false);
  const sortFieldLabels = {
    album: "Album Title",
    artist: "Artist",
  } as const;
  //#endregion

  //#region Helpers
  useEffect(() => {
    setQuery({ sort: albumSort });
    setSort(albumSort);
  }, [setQuery, setSort, albumSort]);

  useEffect(() => {
    const selector =
      sortField === "album"
        ? (song: Song) => song.album
        : (song: Song) => song.artist;

    const sort = { selector, desc: sortDesc };

    setQuery({ sort });
    setSort(sort);
  }, [sortField, sortDesc, setQuery, setSort]);

  // Source chips narrow the already-filtered list; an empty selection keeps
  // every song.
  const visibleSongs = useMemo(
    () =>
      selectedSourceIds.length === 0
        ? filteredSongs
        : filteredSongs.filter((song) =>
          selectedSourceIds.includes(song.sourceId)
        ),
    [filteredSongs, selectedSourceIds]
  );

  const albums = useMemo(() => {
    const map = new Map<string, Album>();

    for (const song of visibleSongs) {
      const title = song.album || "Unknown Album";
      const artist = song.artist || "Unknown Artist";
      const key = `${title}-${artist}`;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          title,
          artist,
          pictureSongId: song.id,
          songs: [song],
        });
      } else {
        map.get(key)!.songs.push(song);
      }
    }

    return Array.from(map.values());
  }, [visibleSongs]);

  const coverFlowItems = useMemo<CoverFlowItem[]>(
    () =>
      albums.map((a) => ({
        id: a.id,
        image: a.pictureSongId ?? "",
        title: a.title,
        subtitle: a.artist,
      })),
    [albums]
  );
  //#endregion

  //#region Interactivity handlers
  function handleAlbumCardClick(album: Album) {
    if (activeMode !== "edit") {
      // Playback mode: show the album (art, actions, tracks) in a modal
      // rather than jumping into the editor.
      setAlbumModal(album);
      return;
    }

    const ids = album.songs.map((s) => s.id);
    wmmBus.publish("wmm.ui.editorModeChanged", { mode: "edit" });
    wmmBus.publish("wmm.ui.selectionChanged", { songIds: ids });
  }

  function handleAlbumCardDoubleClick(album: Album) {
    if (activeMode !== "edit") {
      wmmBus.invoke("wmm.playback.playQueue", {
        songIds: albums[selectedAlbumIndex].songs.map((s) => s.id),
      });
      wmmBus.invoke("wmm.playback.playSong", { songId: album.songs[0].id });
    } else {
      // Layout is already in edit mode: the Editor (albums mode) is mounted
      // with the wmm.library.song.edit handler registered, so opening the
      // album's advanced editor is deterministic — no navigation needed.
      const firstSong = album.songs[0];
      if (firstSong) {
        wmmBus.invoke("wmm.library.song.edit", { songId: firstSong.id });
      }
      return;
    }
    // Not in edit mode: never start playback. Just select the album's songs
    // (same as a single click) so the drawer shows the album contents.
    wmmBus.publish("wmm.ui.selectionChanged", {
      songIds: album.songs.map((s) => s.id),
    });
  }

  function handleSongDoubleClicked(song: Song) {
    if (activeMode !== "edit") {
      // In playback mode, double-click plays the album queue + this song.
      wmmBus.invoke("wmm.playback.playQueue", {
        songIds: albums[selectedAlbumIndex].songs.map((s) => s.id),
      });
      wmmBus.invoke("wmm.playback.playSong", { songId: song.id });
    } else {
      // In edit mode (album clicked or app in edit mode), the song table is the
      // edit surface for the selected album, so double-clicking a song opens the
      // advanced editor.
      wmmBus.invoke("wmm.library.song.edit", { songId: song.id });
    }
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
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between py-2 border-b mb-2 px-3">
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "grid" | "coverflow")}
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value="grid">
              <Grid2x2 /> Grid
            </TabsTrigger>
            <TabsTrigger value="coverflow">
              <GalleryHorizontal /> Cover Flow
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <div className="bg-muted flex border border-foreground/15 rounded-md">
            <Select
              value={sortField}
              onValueChange={(v) => setSortField(v as "album" | "artist")}
            >
              <SelectTrigger className="w-35">
                <SelectValue>{sortFieldLabels[sortField]}</SelectValue>
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="album">Album Title</SelectItem>
                <SelectItem value="artist">Artist</SelectItem>
              </SelectContent>
            </Select>
            <Toggle
              pressed={sortDesc}
              onPressedChange={(p) => setSortDesc(p)}
              className="px-3 py-1 aria-pressed:bg-transparent"
            >
              {sortDesc ? (
                <ArrowDownAZ className="h-4 w-4" />
              ) : (
                <ArrowUpAZ className="h-4 w-4" />
              )}
            </Toggle>
          </div>
        </div>
      </div>

      {viewMode === "grid" && (
        <>
          <ScrollArea className="flex-1 min-h-0 min-w-0 overflow-auto">
            <div
              className="
              grid
              grid-cols-2
              sm:grid-cols-3
              md:grid-cols-4
              lg:grid-cols-5
              xl:grid-cols-6
              p-3 gap-3
            "
            >
              {albums.map((a) => (
                <AlbumCard
                  key={`${a.title}-${a.artist}`}
                  album={a}
                  onClick={handleAlbumCardClick}
                  onDoubleClick={handleAlbumCardDoubleClick}
                />
              ))}
            </div>
          </ScrollArea>
        </>
      )}
      {viewMode === "coverflow" && (
        <>
          <div className="h-80 shrink-0">
            <CoverFlow
              items={coverFlowItems}
              itemWidth={220}
              itemHeight={220}
              centerGap={160}
              stackSpacing={50}
              initialIndex={selectedAlbumIndex}
              onIndexChange={setSelectedAlbumIndex}
              enableReflection
              onItemClick={(_, index) => {
                const opensPanel = isCompact || activeMode === "edit";
                if (
                  opensPanel &&
                  index === selectedAlbumIndex &&
                  albums[index]
                ) {
                  handleAlbumCardClick(albums[index]);
                }
              }}
              renderImage={({ src, className }) => (
                <AlbumArtImage
                  songId={src || undefined}
                  thumbSize={ThumbnailSize.thumb512}
                  className={className}
                />
              )}
            />
          </div>
          {albums.length > 1 && (
            <div className="scrollbar-slider mt-2">
              <Slider
                aria-label="Scroll albums"
                min={0}
                max={albums.length - 1}
                step={1}
                value={[Math.min(selectedAlbumIndex, albums.length - 1)]}
                onValueChange={(v) =>
                  setSelectedAlbumIndex(Array.isArray(v) ? v[0] : v)
                }
              />
            </div>
          )}
          <ScrollArea className="flex-1 min-h-0">
            <TanstackSongTable
              songs={albums[selectedAlbumIndex]?.songs ?? []}
              selectedSongIds={nowPlayingSongId ? [nowPlayingSongId] : []}
              onSongDoubleClicked={handleSongDoubleClicked}
              isEditMultiple={false}
            />
          </ScrollArea>
        </>
      )}

      <AlbumDetailModal
        album={albumModal}
        open={albumModal !== undefined}
        onOpenChange={(next) => {
          if (!next) setAlbumModal(undefined);
        }}
      />
    </div>
  );
}
