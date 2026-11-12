import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router";
import { Disc3, Loader2, Music, Music4 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AddMusicSource } from "@/components/add-source/AddMusicSource";
import { TanstackSongTable } from "@/components/song-table";
import { TrackItem } from "@/components/track-item";
import { ItemGroup } from "@/components/ui/item";
import { AlphabetScrubber } from "@/components/alphabet-scrubber";
import { buildLetterIndex, scrollListToIndex } from "@/lib/alphabet";
import { useIsCompact } from "@/lib/hooks/useIsMobile";
import { getStore } from "@/core/system";
import { wmmBus } from "@/events";
import {
  selectors,
  type QueryOptions,
  type SortableColumn,
} from "@/lib/persistence";
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
  const { sort, setSort, activeMode, selectedSourceIds } =
    useOutletContext<MainContext>();

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

  const [songSort] = useState({
    selector: (song: Song) => song.title,
    desc: false,
  });

  const noMusicSources = musicSources.length === 0;

  const listRef = useRef<HTMLDivElement>(null);
  const letterIndex = useMemo(() => {
    const selector = sort?.selector ?? songSort.selector;
    return buildLetterIndex(
      visibleSongs.map((song) => {
        const value: unknown = selector(song);
        return typeof value === "string" ? value : null;
      })
    );
  }, [visibleSongs, sort, songSort]);

  // Highlight the row of the currently playing song in the mobile list.
  useEffect(() => {
    return wmmBus.on("wmm.playback.started", (payload) => {
      setNowPlayingSongId(payload?.songId);
    });
  }, []);

  const isCompact = useIsCompact();
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
      songIds: visibleSongs.map((s) => s.id),
    });
  }, [visibleSongs]);
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
    const editingMultiple =
      activeMode === "edit" || isEditMultiple || selectedSongIds.length > 1;
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
          <div
            className="relative flex-1 flex items-center justify-center p-4"
            hidden={!noMusicSources}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 text-accent opacity-[0.12] bg-[radial-gradient(circle,currentColor_1px,transparent_1.5px)] bg-size-[18px_18px] mask-[radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
            />
            <Card className="relative w-full max-w-md gap-0 py-0 text-center">
              <div className="relative flex flex-col items-center gap-3 overflow-hidden bg-accent px-10 py-10 text-accent-foreground">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgb(255_255_255/0.28),transparent_55%),radial-gradient(circle_at_90%_100%,rgb(0_0_0/0.25),transparent_50%)]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-8 -top-8 size-32 rounded-full bg-white/10"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-10 -right-6 size-36 rounded-full bg-black/10"
                />
                <Music
                  aria-hidden="true"
                  className="pointer-events-none absolute left-6 bottom-4 size-8 -rotate-12 opacity-20"
                />
                <Music4
                  aria-hidden="true"
                  className="pointer-events-none absolute right-8 top-5 size-10 rotate-12 opacity-20"
                />
                <Disc3
                  aria-hidden="true"
                  className="pointer-events-none absolute right-5 bottom-6 size-6 opacity-20"
                />
                <div className="relative flex size-20 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/25 backdrop-blur-sm">
                  <Music size={40} />
                </div>
              </div>
              <div className="flex flex-col items-center gap-6 p-8">
                <AddMusicSource inline onSourceAdded={refresh} />
              </div>
            </Card>
          </div>

          <div
            className="relative flex-1 min-h-0 min-w-0"
            hidden={noMusicSources}
          >
            <ScrollArea ref={listRef} className="h-full min-w-0 overflow-auto">
              {isCompact ? (
                <ItemGroup className="mx-auto w-full max-w-3xl pr-3 gap-0! has-data-[size=sm]:gap-0! has-data-[size=xs]:gap-0!">
                  {visibleSongs.map((song, i) => (
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
                    songs={visibleSongs}
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
            {letterIndex.size > 0 && (
              <AlphabetScrubber
                availableLetters={new Set(letterIndex.keys())}
                className={isCompact ? "right-0" : "right-3"}
                autoHide={isCompact}
                reversed={sort?.desc}
                scrollRef={listRef}
                onSelect={(letter) =>
                  scrollListToIndex(
                    listRef.current,
                    letterIndex.get(letter) ?? 0,
                    visibleSongs.length
                  )
                }
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
