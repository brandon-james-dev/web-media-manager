"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Music,
  FileMusicIcon,
  CogIcon,
  XIcon,
  PenIcon,
  CheckCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Song } from "@/models/Song";
import { Link } from "react-router";
import useFileSystemAccess, { showDirectoryPicker } from "use-fs-access";
import { SongTable } from "@/components/song-table";
import { Id3EditorDrawer } from "@/components/id3-editor-drawer";
import {
  startWriteLoop,
  subscribeToWriteEvents,
} from "@/lib/pendingWriteWorkerClient";
import type { PendingImportFile } from "@/models";
import {
  enqueueImportJob,
  subscribeToImportEvents,
} from "@/lib/pendingImportWorkerClient";
import {
  sortPendingImportsByCol,
  useInsertPendingImport,
} from "@/hooks/pendingImportHooks";
import {
  useCountPendingWrites,
  useInsertPendingWrite,
} from "@/hooks/pendingWriteHooks";
import { useAlbums, useSongsInDb } from "@/hooks/songQueryHooks";
import { type SortingState } from "@tanstack/react-table";
import { useCountPendingArtwork } from "@/hooks/thumbnailQueryHooks";
import { startPendingArtLoop } from "@/lib/albumArtWorkerClient";
import fuzzysearch from "fuzzysearch-ts";
import { base64ToArrayBuffer } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlbumView } from "@/components/album-view";
import type { Album } from "@/components/album-view/types";

export default function Main() {
  const songs = useSongsInDb() || [];
  const albums = useAlbums() || [];
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [selectedAlbums, setSelectedAlbums] = useState<Album[]>([]);
  const [totalSongs, setTotalSongs] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(false);
  const [tab, setTab] = useState("songs");
  const bulkRef = useRef(isBulkSelectEnabled);
  bulkRef.current = isBulkSelectEnabled;
  const searchRef = useRef("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  //#region Song and Album sorting and filtering
  const [sorting, setSorting] = useState<SortingState>([
    { id: "tags.title", desc: false },
  ]);

  const filteredSongs = useMemo(() => {
    const q = debouncedSearch.toLowerCase().replace(/[^A-Za-z]/g, "");
    if (!q) return songs;

    return songs.filter((song) => {
      const title = song.tags?.title?.toLowerCase() ?? "";
      const artist = song.tags?.artist?.toLowerCase() ?? "";
      const album = song.tags?.album?.toLowerCase() ?? "";
      const albumArtist = song.tags?.albumArtist?.toLowerCase() ?? "";

      return (
        fuzzysearch(q, title) ||
        fuzzysearch(q, artist) ||
        fuzzysearch(q, album) ||
        fuzzysearch(q, albumArtist)
      );
    });
  }, [songs, debouncedSearch]);

  const filteredAlbums = useMemo(() => {
    const q = debouncedSearch.toLowerCase().replace(/[^A-Za-z]/g, "");
    if (!q) return albums;

    return albums.filter((album) => {
      const title = album.albumName.toLowerCase() ?? "";
      const artist = album.artist.toLowerCase() ?? "";
      const songTitles = album.songs
        .map((s) => s.title?.toLowerCase())
        .filter((t) => t !== undefined);

      return (
        fuzzysearch(q, title) ||
        fuzzysearch(q, artist) ||
        songTitles.some((t) => fuzzysearch(q, t))
      );
    });
  }, [albums, debouncedSearch]);

  const sortedSongs = useMemo(() => {
    if (sorting.length === 0) return filteredSongs;

    const { id, desc } = sorting[0];
    const key = id.replaceAll("_", ".");

    return [...filteredSongs].sort((a, b) => {
      const aVal = key.split(".").reduce((o: any, k) => o?.[k], a);
      const bVal = key.split(".").reduce((o: any, k) => o?.[k], b);

      if (aVal < bVal) return desc ? 1 : -1;
      if (aVal > bVal) return desc ? -1 : 1;
      return 0;
    });
  }, [filteredSongs, sorting]);

  const didRun = useRef(false);
  const debounceTimer = useRef<number | null>(null);

  const triggerDebounce = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchRef.current);
    }, 250);
  };
  //#endregion

  //#region Directory selection
  const { openDirectory } = useFileSystemAccess();

  const selectDirectory = async () => {
    const dir = await showDirectoryPicker();
    if (!dir || dir instanceof Error) return;

    const files: PendingImportFile[] = [];
    const directoryEntries = await openDirectory(dir);
    const filesMap = new Map(directoryEntries?.entries());
    const filesInDirectory = Array.from(filesMap.values()).filter(
      (fd) =>
        fd.kind === "file" &&
        fd.type.includes("audio/mpeg") &&
        fd.path.toLowerCase().endsWith(".mp3"),
    );

    for (const entry of filesInDirectory) {
      files.push({
        name: entry.name,
        status: "pending",
      });
    }

    const jobId = await useInsertPendingImport(dir, files);

    enqueueImportJob(jobId);
  };
  //#endregion

  //#region Event listeners
  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const init = async () => {
      // Resume pending writes if any

      const pendingWriteCount = await useCountPendingWrites();
      if (pendingWriteCount > 0) {
        startWriteLoop();
      }

      const pendingArtCount = await useCountPendingArtwork();

      if (pendingArtCount > 0) {
        startPendingArtLoop();
      }

      const pendingImportJobs = await sortPendingImportsByCol(
        "createdAt",
        "desc",
      );
      const lastJob = pendingImportJobs[0];

      if (lastJob && lastJob.files.some((f) => f.status !== "done")) {
        enqueueImportJob(lastJob.id!);
      }

      subscribeToWriteEvents((msg) => {
        if (msg.type === "write-complete") {
          toast.success(`Saved changes`);
        }

        if (msg.type === "write-error") {
          toast.error(`Failed to save ${msg.job.songId}`);
        }
      });

      subscribeToImportEvents((msg) => {
        switch (msg.type) {
          case "progress":
            if (msg.total != totalSongs) setTotalSongs(msg.total);
            break;
          default:
            break;
        }
      });
    };

    init();
  }, []);
  //#endregion

  return (
    <>
      <div className="w-full h-full mx-auto px-6 pt-4 pb-2">
        <div className="h-full flex flex-col gap-2">
          <div className="shrink-0">
            <div className="flex justify-between items-center">
              <Music className="w-6 h-6" />
              <h1 className="font-bold pointer-events-none">Song Library</h1>
              <div>
                <Link to="/settings">
                  <Button variant="outline">
                    <CogIcon />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex justify-center" hidden={songs.length === 0}>
              <Input
                placeholder="Search songs"
                defaultValue=""
                onChange={(e) => {
                  searchRef.current = e.target.value;
                  triggerDebounce();
                }}
                className="w-sm-full max-w-4xl"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="h-full flex flex-col">
              <div
                className="sticky top-0 z-20
                           w-full shrink-0
                           flex items-stretch gap-2 mb-3 py-2
                           border-b bg-background"
              >
                <div className="flex shrink gap-2" hidden={songs.length === 0}>
                  <Button
                    className="w-40"
                    variant="outline"
                    size="xs"
                    disabled={selectedSongs.length === 0}
                    onClick={() => {
                      setSelectedSongs([]);
                      setSelectedAlbums([]);
                    }}
                  >
                    <XIcon />
                    Deselect
                  </Button>
                  <Button
                    className="w-40"
                    size="xs"
                    disabled={selectedSongs.length === 0}
                    variant={isBulkSelectEnabled ? "default" : "outline"}
                    onClick={() => {
                      const lastSelectedSong = selectedSongs?.at(
                        selectedSongs.length - 1,
                      );
                      if (lastSelectedSong) {
                        setSelectedSongs([lastSelectedSong]);
                      }
                      const lastSelectedAlbum = selectedAlbums?.at(
                        selectedAlbums.length - 1,
                      );
                      if (lastSelectedAlbum) {
                        setSelectedAlbums([lastSelectedAlbum]);
                      }
                      setIsBulkSelectEnabled(!isBulkSelectEnabled);
                    }}
                  >
                    <CheckCheck />
                    Bulk Selection
                  </Button>
                  <Button
                    className="w-40"
                    size="xs"
                    disabled={selectedSongs.length === 0}
                    onClick={() => setDrawerOpen(true)}
                  >
                    <PenIcon />
                    Edit
                  </Button>
                </div>
                <div
                  className="flex-1 justify-items-end gap-2"
                  hidden={songs.length === 0}
                >
                  <Tabs
                    defaultValue="songs"
                    value={tab}
                    onValueChange={(tab) => {
                      setTab(tab);
                      setSelectedAlbums([]);
                      setSelectedSongs([]);
                    }}
                  >
                    <TabsList>
                      <TabsTrigger value="songs">Songs</TabsTrigger>
                      <TabsTrigger value="albums">Albums</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
              <div className="flex-1 w-full container-type-size">
                <ScrollArea ref={scrollAreaRef} className="container-height">
                  {songs.length == 0 && didRun.current && (
                    <Empty hidden={songs.length > 0}>
                      <EmptyHeader className="pointer-events-none">
                        <EmptyMedia variant="icon">
                          <FileMusicIcon />
                        </EmptyMedia>
                        <EmptyTitle>No Songs Yet</EmptyTitle>
                        <EmptyDescription>
                          You haven&apos;t imported any songs yet. Get started
                          by importing your songs from your chosen directory.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent className="flex-row justify-center gap-2">
                        <Button onClick={selectDirectory}>Import Songs</Button>
                      </EmptyContent>
                    </Empty>
                  )}
                  {songs.length > 0 && tab === "songs" && (
                    <SongTable
                      songs={sortedSongs}
                      sorting={sorting}
                      onSortingChange={setSorting}
                      rowSelection={selectedSongs}
                      onRowSelectionChange={setSelectedSongs}
                      isBulkSelectEnabled={bulkRef}
                      containerRef={scrollAreaRef}
                      onEnterKey={() => setDrawerOpen(true)}
                    />
                  )}
                  {songs.length > 0 && tab === "albums" && (
                    <AlbumView
                      albums={filteredAlbums}
                      onSelectAlbums={(albums: Album[]) => {
                        setSelectedAlbums(albums);
                        setSelectedSongs(albums.flatMap((a) => a.songs));
                      }}
                      selectedAlbums={selectedAlbums}
                      isBulkSelectEnabled={bulkRef}
                    />
                  )}
                  <ScrollBar orientation="horizontal" />
                  <ScrollBar orientation="vertical" />
                </ScrollArea>
              </div>
            </div>
          </div>

          <div className="shrink-0" hidden={totalSongs == 0}>
            <div className="flex items-center gap-2">
              <Progress
                value={(songs.length / totalSongs) * 100}
                max={100}
                className="w-30"
              />
              <label className="text-sm text-muted-foreground">
                Loaded {songs.length} of {totalSongs} items
              </label>
            </div>
          </div>
        </div>
      </div>

      <Id3EditorDrawer
        isOpen={drawerOpen}
        selectedSongs={selectedSongs}
        onOpenChange={setDrawerOpen}
        onSave={async (updatedSongs) => {
          for (const [song, tags] of updatedSongs) {
            if (!tags) continue;
            await useInsertPendingWrite(song.id, tags);
            startWriteLoop();
          }

          setDrawerOpen(false);
        }}
      />
    </>
  );
}
