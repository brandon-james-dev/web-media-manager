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
import { Music, FileMusicIcon, CogIcon, XIcon, PenIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Song } from "../models/Song";
import { Link } from "react-router";
import useFileSystemAccess, { showDirectoryPicker } from "use-fs-access";
import { mediaDb } from "@/data";
import { SongTable } from "@/components/song-table";
import { Id3Drawer } from "@/components/id3-drawer";
import {
  startWriteLoop,
  subscribeToWriteEvents,
} from "@/lib/pendingWriteWorkerClient";
import type { PendingImportFile } from "@/models";
import { enqueueImportJob, subscribeToImportEvents } from "@/lib/pendingImportWorkerClient";

export default function Main() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [totalSongs, setTotalSongs] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const buffer = useRef<Song[]>([]);

  const filteredSongs = songs.filter(
    (song) =>
      song.tags?.title?.toLowerCase().includes(search.toLowerCase()) ||
      song.tags?.artist?.toLowerCase().includes(search.toLowerCase()) ||
      song.tags?.album?.toLowerCase().includes(search.toLowerCase()) ||
      song.tags?.albumArtist?.toLowerCase().includes(search.toLowerCase()),
  );

  const addSong = (song: Song) => {
    buffer.current.push(song);

    if (buffer.current.length === 1) {
      requestAnimationFrame(() => {
        setSongs((prev) => [...prev, ...buffer.current]);
        buffer.current = [];
      });
    }
  };

  const { openDirectory } = useFileSystemAccess();
  
  const selectDirectory = async () => {
    const dir = await showDirectoryPicker();
    if (!dir || dir instanceof Error) return;

    const files: PendingImportFile[] = [];
    const directoryEntries = await openDirectory(dir);
    const filesMap = new Map(directoryEntries?.entries());
    const filesInDirectory = Array.from(filesMap.values()).filter(
      (fd) => fd.kind === "file",
    );

    for (const entry of filesInDirectory) {
      files.push({
        name: entry.name,
        status: "pending",
      });
    }

    const jobId = await mediaDb.pendingImports.add({
      directoryHandle: dir,
      files,
      createdAt: Date.now(),
    });
    
    enqueueImportJob(jobId);
  };

  const onSelectSong = (song: Song): void => {
    setSelectedSong(song);
  };

  const onOpenChange = (openState: boolean) => {
    setDrawerOpen(openState);
  };

  const didRun = useRef(false);

  //#region Event listeners
  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const init = async () => {
      // Resume pending writes
      mediaDb.pendingWrites.count().then((count) => {
        if (count > 0) startWriteLoop();
      });

      const lastJob = await mediaDb.pendingImports.orderBy("createdAt").last();
      if (lastJob && lastJob.files.some(f => f.status !== "done")) {
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

      subscribeToImportEvents(async (msg) => {
        switch (msg.type) {
          case "progress":
            setTotalSongs(msg.total);
            break;

          case "song-imported": {
            const song = msg.payload;
            addSong(song);
            break;
          }

          case "file-error":
            toast.error(`Error importing ${msg.file}: ${msg.error}`);
            break;
        }
      });

      // Load songs into UI
      const songs = await mediaDb.songs.toArray();
      setSongs(songs);
    };

    init();
  }, []);
  //#endregion

  return (
    <>
      <div className="w-full h-full mx-auto px-6 pt-4 pb-2">
        <div className="h-full flex flex-col gap-2">
          <div className="shrink-0">
            <div className="flex justify-between items-center gap-2 mb-4">
              <Music className="w-6 h-6 inline pr-1" />
              <h1 className="text-3xl font-bold pointer-events-none">
                Song Library
              </h1>
              <div>
                <Link to="/settings">
                  <Button variant="outline">
                    <CogIcon />
                  </Button>
                </Link>
              </div>
            </div>
            <div
              className={
                filteredSongs.length == 0 ? "hidden" : "flex justify-center"
              }
            >
              <Input
                placeholder="Search songs or artists..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-sm-full max-w-4xl"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div
              className={`h-full flex flex-col${didRun.current ? "" : " hidden"}`}
            >
              {selectedSong && (
                <div
                  className="sticky top-0 z-20
                             w-full shrink-0
                             flex items-center gap-2 mb-3 p-2
                             border-b bg-background"
                >
                  <Button
                    className="w-40"
                    variant="outline"
                    onClick={() => setSelectedSong(null)}
                  >
                    <XIcon />
                    Deselect
                  </Button>
                  <Button className="w-40" onClick={() => setDrawerOpen(true)}>
                    <PenIcon />
                    Edit
                  </Button>

                  <div className="ml-auto text-sm text-muted-foreground select-none">
                    <div className="flex gap-2">
                      <span
                        hidden={!selectedSong.tags?.artist}
                        className="after:content-['-'] after:ml-2 last:after:content-none"
                      >
                        {selectedSong.tags?.artist}
                      </span>
                      <span
                        hidden={!selectedSong.tags?.album}
                        className="after:content-['-'] after:ml-2 last:after:content-none"
                      >
                        {selectedSong.tags?.album}
                      </span>
                      <span>{selectedSong.tags?.title ?? selectedSong.id}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex-1 w-full container-type-size">
                <ScrollArea className="container-height">
                  {filteredSongs.length === 0 && (
                    <Empty>
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
                  {filteredSongs.length > 0 && (
                    <SongTable
                      onSelectSong={onSelectSong}
                      selectedSong={selectedSong}
                    />
                  )}

                  <ScrollBar orientation="horizontal" />
                  <ScrollBar orientation="vertical" />
                </ScrollArea>
              </div>
            </div>
          </div>

          <div className={`shrink-0${totalSongs === 0 ? " hidden" : ""}`}>
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

      <Id3Drawer
        isOpen={drawerOpen}
        selectedSong={selectedSong}
        onOpenChange={onOpenChange}
        onSave={async (songId, tags) => {
          await mediaDb.pendingWrites.add({
            songId,
            tags,
            createdAt: Date.now(),
          });

          startWriteLoop();
          setDrawerOpen(false);
        }}
      />
    </>
  );
}
