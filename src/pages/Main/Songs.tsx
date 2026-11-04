import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { Loader2, Music } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AddMusicSource } from "@/components/add-source/AddMusicSource";
import { TanstackSongTable } from "@/components/song-table";
import { TrackItem } from "@/components/track-item";
import { ItemGroup } from "@/components/ui/item";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { getStore } from "@/core/system";
import { wmmBus } from "@/events";
import { selectors, type QueryOptions, type SortableColumn } from "@/lib/persistence";
import { useSongs } from "@/hooks";
import type { MusicSource, Song } from "@/models";
import type { MainContext } from "./MainLayout";

export function Songs() {
  //#region State
  const [musicSources, setMusicSources] = useState<MusicSource[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [isEditMultiple, setIsEditMultiple] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [nowPlayingSongId, setNowPlayingSongId] = useState<string>();

  const { filteredSongs, query, setQuery } = useSongs();
  const { sort, setSort, activeMode } = useOutletContext<MainContext>();

  const [songSort] = useState({
    selector: (song: Song) => song.title,
    desc: false,
  });

  const noMusicSources = musicSources.length === 0;

  // Highlight the row of the currently playing song in the mobile list.
  useEffect(() => {
    return wmmBus.on("wmm.playback.started", (payload) => {
      setNowPlayingSongId(payload?.songId);
    });
  }, []);

  const isMobile = useIsMobile();
  //#endregion

  //#region Subscribe to domain events
  useEffect(() => {
    setQuery({ sort: songSort });
    setSort(songSort);
  }, [setQuery, setSort, songSort]);
  //#endregion

  //#region Helpers
  async function refresh() {
    const store = getStore();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const sources = await store.getSources();
    setMusicSources(sources);
  }

  useEffect(() => {
    const store = getStore();

    store.getSources().then((next) => {
      setMusicSources(next);
      setIsLoading(false);
    });

    const unsubDirAdded = store.onSourceAdded(refresh);
    const unsubSongsCleared = store.onStoreCleared(refresh);

    return () => {
      unsubDirAdded();
      unsubSongsCleared();
    };
  }, []);

  useEffect(() => {
    const subSelected = wmmBus.on("wmm.ui.selectionChanged", (payload) => {
      setSelectedSongIds(payload?.songIds ?? []);
    });
    const subEditMultiple = wmmBus.on("wmm.ui.editorModeChanged", (payload) => {
      setIsEditMultiple(payload?.mode === "edit");
    });

    return () => {
      subSelected();
      subEditMultiple();
    };
  }, [filteredSongs]);

  // Publish the Songs view's current filtered+sorted order as the playback
  // *collection context*. When the playlist is empty, next/prev + end-of-song
  // walk this list. Live: re-publishes on every sort/filter/query change.
  useEffect(() => {
    wmmBus.invoke("wmm.playback.setCollectionSource", {
      songIds: filteredSongs.map((s) => s.id),
    });
  }, [filteredSongs]);
  //#endregion

  //#region Interactivity handlers
  function handleSort(column: SortableColumn) {
    const selector = selectors[column];
    const isSame = sort?.selector === selector;

    const nextSort = {
      selector,
      desc: isSame ? !sort?.desc : false,
    };

    setSort(nextSort);

    const nextQuery: QueryOptions<Song> = {
      ...query,
      sort: nextSort,
      filter: query.filter,
      skip: 0,
      page: 0,
    };

    setQuery(nextQuery);
  }

  function handleSongsSelected(ids: string[]) {
    wmmBus.publish("wmm.ui.selectionChanged", { songIds: ids });
  }

  function handleSongDoubleClicked(song: Song) {
    const editingMultiple = activeMode === "edit" || isEditMultiple || selectedSongIds.length > 1;
    if (editingMultiple) {
      // In edit mode, double-click opens the advanced editor for the song.
      wmmBus.invoke("wmm.library.song.edit", { songId: song.id });
    } else {
      wmmBus.invoke("wmm.playback.playSong", { songId: song.id });
    }
  }
  //#endregion

  return (
    <div className="h-full w-full flex flex-col">
      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-full w-full">
          <span>
            <Loader2 className="inline-block animate-spin" /> Loading…
          </span>
        </div>
      ) : (
        <>
          <div className="flex-1 flex items-center justify-center" hidden={!noMusicSources}>
            <Card className="p-10 flex flex-col items-center gap-6">
              <Music className="font-accent" size={48} />
              <h1 className="text-3xl font-bold">Add Music</h1>
              <AddMusicSource onSourceAdded={refresh} />
            </Card>
          </div>

          <ScrollArea className="flex-1 min-h-0 min-w-0 overflow-auto" hidden={noMusicSources}>
            {isMobile ? (
              <ItemGroup>
                {filteredSongs.map((song, i) => (
                  <TrackItem
                    key={song.id}
                    song={song}
                    index={i}
                    size="sm"
                    showArtwork
                    isPlaying={nowPlayingSongId === song.id}
                    // Touch: single tap plays (the row becomes a finger-size
                    // target). Double-click still works on desktop-modality
                    // touchpads/mice. No inline play button here.
                    onClick={
                      activeMode === "edit"
                        ? handleSongDoubleClicked
                        : () =>
                            wmmBus.invoke("wmm.playback.playSong", {
                              songId: song.id,
                            })
                    }
                    onDoubleClick={handleSongDoubleClicked}
                  />
                ))}
              </ItemGroup>
            ) : (
              <>
                <TanstackSongTable
                  songs={filteredSongs}
                  selectedSongIds={selectedSongIds}
                  isEditMultiple={isEditMultiple}
                  onSelect={handleSongsSelected}
                  onSort={handleSort}
                  sort={sort}
                  onSongDoubleClicked={handleSongDoubleClicked}
                />
                <ScrollBar orientation="horizontal" />
              </>
            )}
          </ScrollArea>
        </>
      )}
    </div>
  );
}
