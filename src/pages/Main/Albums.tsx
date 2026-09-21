import { useEffect, useMemo, useState } from "react";
import { uuidv7 } from "uuidv7";
import { useSongs } from "@/providers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlbumCard } from "@/components/album-card";
import { AlbumDetailDialog } from "@/components/album-detail-dialog";
import { useOutletContext } from "react-router";
import { applySongEdits } from "@/lib";
import { backgroundService } from "@/lib/background-jobs";
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

function Albums() {
  //#region State
  const { filteredSongs } = useSongs();
  const [isAlbumDetailsDialogOpen, setIsAlbumDetailsDialogOpen] =
    useState<boolean>(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | undefined>();
  const { setQuery, refreshSongs } = useSongs();
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
          id: uuidv7(),
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
    setSelectedAlbum(album);
    setIsAlbumDetailsDialogOpen(true);
  }

  function isAlbumDetailsPrevButtonDisabled(): boolean {
    if (!selectedAlbum) return false;

    const albumIds = albums.map((a) => a.id);
    const albumIndex = albumIds.indexOf(selectedAlbum.id);

    return albumIndex === 0;
  }

  function isAlbumDetailsNextButtonDisabled(): boolean {
    if (!selectedAlbum) return false;

    const albumIds = albums.map((a) => a.id);
    const albumIndex = albumIds.indexOf(selectedAlbum.id);

    return albumIndex === albumIds.length - 1;
  }

  function handleAlbumDetailsPrevClicked() {
    if (!selectedAlbum) return;

    const albumIds = albums.map((a) => a.id);
    const albumIndex = albumIds.indexOf(selectedAlbum.id);

    setSelectedAlbum(albums.at(albumIndex - 1));
  }

  function handleAlbumDetailsNextClicked() {
    if (!selectedAlbum) return;

    const albumIds = albums.map((a) => a.id);
    const albumIndex = albumIds.indexOf(selectedAlbum.id);

    setSelectedAlbum(albums.at(albumIndex + 1));
  }

  async function handleAlbumDetailFormSubmit(form: FormData) {
    const result: any = {};

    for (const [key, value] of form.entries()) {
      // Example key: "songs[0].title"
      const path = key.replace(/\]/g, "").split(/\[|\./g);

      let current = result;

      for (let i = 0; i < path.length; i++) {
        const part = path[i];
        const isLast = i === path.length - 1;

        if (isLast) {
          current[part] = value;
        } else {
          const nextPart = path[i + 1];
          const isArrayIndex = /^\d+$/.test(nextPart);

          if (!current[part]) {
            current[part] = isArrayIndex ? [] : {};
          }

          current = current[part];
        }
      }
    }

    for (const song of result.songs) {
      let currentSong = filteredSongs.find((s) => s.id == song.id);

      if (currentSong) {
        const updatedSong: Partial<Song> = {
          ...song,
        };

        if (result.coverFront) {
          updatedSong.coverFront = new Blob([result.coverFront as File]);
        }

        delete updatedSong.id;

        await applySongEdits(currentSong, updatedSong);
        backgroundService.enqueue({
          type: "artworkProcess",
          payload: {
            song: {
              ...currentSong,
              ...updatedSong,
            },
          },
        });
      }
    }

    await refreshSongs();
    setIsAlbumDetailsDialogOpen(false);
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
              />
            ))}
          </div>
        )}
      </ScrollArea>
      {selectedAlbum && (
        <AlbumDetailDialog
          open={isAlbumDetailsDialogOpen}
          onOpenChange={setIsAlbumDetailsDialogOpen}
          album={selectedAlbum}
          isPrevButtonDisabled={isAlbumDetailsPrevButtonDisabled()}
          isNextButtonDisabled={isAlbumDetailsNextButtonDisabled()}
          handlePrevClick={handleAlbumDetailsPrevClicked}
          handleNextClick={handleAlbumDetailsNextClicked}
          onSubmit={handleAlbumDetailFormSubmit}
        />
      )}
    </div>
  );
}

export { Albums };
