import { useEffect, useMemo, useState } from "react";
import { useSongs } from "@/providers";
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
import { Toggle } from "@/components/ui/toggle";
import {
  ArrowDown01,
  ArrowUp01,
  GalleryHorizontal,
  Grid2x2,
} from "lucide-react";
import { songDoubleClicked$, songsSelected$ } from "@/events/song-events";
import { playlistSet$ } from "@/events/player-events";
import { isEditMultipleChanged$ } from "@/events/editor-events";

function Albums() {
  //#region State
  const { filteredSongs } = useSongs();
  const { setQuery } = useSongs();
  const [albumSort] = useState<{
    selector: (song: Song) => void;
    desc: boolean;
  }>({
    selector: (song: Song) => song.album,
    desc: false,
  });
  const [viewMode, setViewMode] = useState<"grid" | "coverflow">("grid");
  const [sortField, setSortField] = useState<"album" | "artist">("album");
  const [sortDesc, setSortDesc] = useState<boolean>(false);
  const sortFieldLabels = {
    album: "Album Title",
    artist: "Artist",
  } as const;
  const { setSort } = useOutletContext<MainContext>();
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

  const albums = useMemo(() => {
    const map = new Map<string, Album>();

    for (const song of filteredSongs) {
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
  }, [filteredSongs]);
  //#endregion

  //#region Interactivity handlers
  function handleAlbumCardClick(album: Album) {
    const ids = album.songs.map((s) => s.id);
    isEditMultipleChanged$.next(true);
    songsSelected$.next(ids);
  }

  function handleAlbumCardDoubleClick(album: Album) {
    playlistSet$.next(album.songs);
    isEditMultipleChanged$.next(true);
    songDoubleClicked$.next(album.songs[0]);
  }
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
            <TabsTrigger value="coverflow" disabled>
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
                <ArrowDown01 className="h-4 w-4" />
              ) : (
                <ArrowUp01 className="h-4 w-4" />
              )}
            </Toggle>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 min-w-0 overflow-auto">
        {viewMode === "grid" && (
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
        )}
      </ScrollArea>
    </div>
  );
}

export { Albums };
