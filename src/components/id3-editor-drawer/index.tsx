"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Form } from "@/components/ui/form";

import { Save, ListRestart, DownloadCloud, X } from "lucide-react";

import type { Id3FormValues, Song } from "@/models";

import { OnlineSrcPreSearchDialog } from "./dialogs/online-src-presearch-dialog";
import { OnlineSrcResultsDialog } from "./dialogs/online-src-results-dialog";

import { useDirtyFields } from "./state/useDirtyFields";
import { useAlbumArt } from "./state/useAlbumArt";

import { applyItunesMetadata } from "./online-src-helpers/applyItunesMetadata";
import { getItunesSongMatches } from "./online-src-helpers/getItunesSongMatches";
import { getStaticThumbnail } from "@/hooks/thumbnailQueryHooks";
import type { MusicResult } from "itunes-web-api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useBulkSearch } from "./state/useBulkSearch";
import { ManualId3EditorPanel } from "./panels/manual-id3-editor-panel";
import { BulkSearchId3EditorPanel } from "./panels/bulk-search-id3-editor-panel";
import { extractItunesMetadata } from "./online-src-helpers/extractItunesMetadata";
import { useSongRepository } from "@/data/useSongRepository";

type Id3EditorDrawerProps = {
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedSongs: Song[];
  className?: string | null;
  onSave?: (updatedSongs: Map<Song, Id3FormValues>) => void;
};

function getInitialValue(key: any, songs: Song[]) {
  const values = songs.map((s) => (s.tags as any)[key]);
  const first = values[0];
  const allSame = values.every((v) => v === first);
  return allSame ? first : "";
}

export function Id3EditorDrawer(props: Id3EditorDrawerProps) {
  const { isOpen, selectedSongs, onOpenChange, onSave, className } = props;
  const isMulti = selectedSongs.length > 1;
  const primarySong = !isMulti ? selectedSongs[0] : null;

  const initialValues: Id3FormValues = useMemo(() => {
    if (!selectedSongs.length) {
      return {
        title: "",
        artist: "",
        album: "",
        albumArtist: "",
        track: "",
        disc: "",
        year: undefined,
        genre: "",
        comment: "",
        composer: "",
        bpm: undefined,
        lyrics: "",
        copyright: "",
        encoder: "",
        picture: undefined,
      };
    }

    return {
      title: getInitialValue("title", selectedSongs),
      artist: getInitialValue("artist", selectedSongs),
      album: getInitialValue("album", selectedSongs),
      albumArtist: getInitialValue("albumArtist", selectedSongs),
      track: getInitialValue("track", selectedSongs),
      disc: getInitialValue("disc", selectedSongs),
      year: getInitialValue("year", selectedSongs),
      genre: getInitialValue("genre", selectedSongs),
      comment: getInitialValue("comment", selectedSongs),
      composer: getInitialValue("composer", selectedSongs),
      bpm: getInitialValue("bpm", selectedSongs),
      lyrics: getInitialValue("lyrics", selectedSongs),
      copyright: getInitialValue("copyright", selectedSongs),
      encoder: getInitialValue("encoder", selectedSongs),
      picture: undefined,
    };
  }, [selectedSongs]);

  const form = useForm<Id3FormValues>({
    defaultValues: initialValues,
  });

  const { dirty, markDirty, resetField, resetAllDirtyFields } =
    useDirtyFields(initialValues);

  const {
    previewArt,
    setPreviewArt,
    isLoading: isAlbumArtLoading,
    setIsLoading: setIsAlbumArtLoading,
    resetAlbumArt,
    setArt,
  } = useAlbumArt(primarySong, form);

  const [itunesPreSearchOpen, setItunesPreSearchOpen] = useState(false);
  const [preSearchTitle, setPreSearchTitle] = useState("");
  const [preSearchArtist, setPreSearchArtist] = useState("");
  const [preSearchAlbum, setPreSearchAlbum] = useState("");

  const [itunesResults, setItunesResults] = useState<MusicResult[]>([]);
  const [itunesModalOpen, setItunesModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("manual");

  const {
    state: bulkState,
    isRunning: bulkRunning,
    progress: bulkProgress,
    start: startBulkSearch,
    cancel: cancelBulkSearch,
    previewMatch,
    selectMatch,
  } = useBulkSearch(selectedSongs, async (title, artist, album) => {
    const results = await getItunesSongMatches(title, artist, album);
    return results;
  });

  const committedBulkMatches = useMemo(() => {
    return bulkState.filter((entry) => entry.selectedMatchId !== null);
  }, [bulkState]);

  const uniqueAlbums: string[] = new Set(
    selectedSongs.map((s) => s.tags?.album),
  )
    .values()
    .toArray()
    .filter((s) => s != undefined);

  async function handleApplyItunes(result: MusicResult) {
    await applyItunesMetadata(
      result,
      form,
      markDirty,
      setPreviewArt,
      setIsAlbumArtLoading,
    );
  }

  async function handleGetItunesSong(
    title: string,
    artist?: string,
    album?: string,
  ) {
    const matches = await getItunesSongMatches(title, artist, album);

    if (matches.length === 1) {
      await handleApplyItunes(matches[0]);
    }

    setItunesResults(matches);
    setItunesModalOpen(true);
  }

  async function processBulkSave() {
    let updatedSongs = new Map<Song, Id3FormValues>();
    for (const entry of committedBulkMatches) {
      const match = entry.matches.find(
        (m) => m.trackId === entry.selectedMatchId,
      );
      if (match) {
        const formValues = await extractItunesMetadata(match);
        const initialSong = await useSongRepository().getSongById(entry.id);

        if (!initialSong) return;

        let updated = {
          ...initialSong,
          tags: formValues,
        };
        if (formValues.picture?.at(0) !== undefined) {
          updatedSongs.set(updated, updated.tags);
        }
      }
      selectMatch(entry.id, null);
    }

    onSave?.(updatedSongs);
    onOpenChange?.(false);
  }

  useEffect(() => {
    if (!isOpen || !selectedSongs.length) return;

    setSelectedTab("manual");
    form.reset(initialValues);
    resetAllDirtyFields(form, resetAlbumArt);
    setPreviewArt(null);
    setIsAlbumArtLoading(false);

    let cleanup: (() => void) | undefined;

    async function loadArt() {
      if (isMulti) return;
      if (!primarySong) return;

      const art = await getStaticThumbnail(primarySong.id);
      if (!art.thumbLarge) return;

      form.setValue("picture", [art.thumbLarge]);
      setPreviewArt(art.thumbLarge);
      cleanup = art.revoke;
    }

    loadArt();

    return () => {
      if (cleanup) cleanup();
    };
  }, [isOpen, selectedSongs, primarySong, form, initialValues]);

  async function handleSubmit(values: Id3FormValues) {
    if (!selectedSongs.length) return;

    const updated = selectedSongs.map((song) => {
      const next = { song, tags: { ...song.tags } as any };

      for (const key in dirty) {
        next.tags[key] = values[key as keyof Id3FormValues];
      }

      return next;
    });

    const updatedMap = new Map(
      updated.map((k) => [k.song, k.tags as Id3FormValues] as const),
    );

    onSave?.(updatedMap);
  }

  function initiatePreSearch() {
    const title = form.getValues("title");
    const artist = form.getValues("artist") || form.getValues("albumArtist");
    const album = form.getValues("album");

    if (!isMulti) {
      if (!title || !artist) {
        setPreSearchTitle(title || "");
        setPreSearchArtist(artist || "");
        setPreSearchAlbum(album || "");
        setItunesPreSearchOpen(true);
        return;
      }

      handleGetItunesSong(title, artist, album);
      return;
    }

    if (!artist || !album) {
      setPreSearchArtist(artist || "");
      setPreSearchAlbum(album || "");
      setItunesPreSearchOpen(true);
      return;
    }

    for (const song of selectedSongs) {
      handleGetItunesSong(song.tags?.title!, artist);
    }
  }

  function onTabSelect(selectedTab: string) {
    resetAllDirtyFields(form, resetAlbumArt);
    setSelectedTab(selectedTab);
  }

  let isSavingDisabled = Object.keys(dirty).length === 0 || isAlbumArtLoading;
  let isResetDisabled = Object.keys(dirty).length === 0;

  if (selectedTab === "bulk-search") {
    const hasCommitted = committedBulkMatches.length > 0;
    isSavingDisabled = !hasCommitted;
    isResetDisabled = !hasCommitted;
  }

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent
        className={`id3-drawer max-h-[90vh] overflow-y-auto after:hidden ${className ?? ""}`}
      >
        <div className="px-4 pb-4">
          <OnlineSrcPreSearchDialog
            open={itunesPreSearchOpen}
            onOpenChange={setItunesPreSearchOpen}
            title={preSearchTitle}
            artist={preSearchArtist}
            album={preSearchAlbum}
            onChangeTitle={setPreSearchTitle}
            onChangeArtist={setPreSearchArtist}
            onChangeAlbum={setPreSearchAlbum}
            onSearch={() =>
              handleGetItunesSong(
                preSearchTitle,
                preSearchArtist,
                preSearchAlbum,
              )
            }
            isMulti={isMulti}
          />

          <OnlineSrcResultsDialog
            open={itunesModalOpen}
            onOpenChange={setItunesModalOpen}
            results={itunesResults}
            onSelect={handleApplyItunes}
          />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <DrawerHeader>
                <div className="relative flex items-center">
                  <div className="mx-auto text-center">
                    <DrawerTitle>
                      {isMulti
                        ? `Edit ID3 Tags (${selectedSongs.length} songs)`
                        : "Edit Song Data"}
                    </DrawerTitle>
                    <DrawerDescription>
                      {isMulti
                        ? "Only fields you modify will be applied to all selected songs."
                        : "Update the metadata for the selected song."}
                    </DrawerDescription>
                  </div>

                  <div className="absolute right-0 top-0 flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          className="bg-blue-500 hover:bg-blue-800 text-white"
                          disabled={isSavingDisabled}
                          onClick={async () => {
                            if (isMulti) {
                              await processBulkSave();
                            } else {
                              form.handleSubmit(handleSubmit)();
                            }
                          }}
                        >
                          <Save />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Save Changes</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          className="border border-neutral-600"
                          disabled={isResetDisabled}
                          type="button"
                          onClick={() => {
                            if (isMulti) {
                              for (const entry of committedBulkMatches) {
                                selectMatch(entry.id, null);
                              }
                            } else {
                              resetAllDirtyFields(form, resetAlbumArt);
                            }
                          }}
                        >
                          <ListRestart />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reset Changes</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          disabled={isMulti}
                          onClick={initiatePreSearch}
                        >
                          <DownloadCloud />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Find song metadata from online sources</p>
                      </TooltipContent>
                    </Tooltip>

                    <DrawerClose asChild>
                      <Button variant="outline" type="button">
                        <X />
                      </Button>
                    </DrawerClose>
                  </div>
                </div>
              </DrawerHeader>

              <div className="space-y-8 lg:w-4xl mx-auto">
                <Tabs
                  defaultValue="manual"
                  value={selectedTab}
                  onValueChange={onTabSelect}
                  className="w-full"
                >
                  <TabsList hidden={!isMulti}>
                    <TabsTrigger value="manual">Manual</TabsTrigger>
                    <TabsTrigger value="bulk-search">
                      Bulk Online Search
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="manual">
                    <ManualId3EditorPanel
                      selectedSongs={selectedSongs}
                      form={form}
                      dirty={dirty}
                      markDirty={markDirty}
                      resetField={resetField}
                      previewArt={previewArt}
                      isAlbumArtLoading={isAlbumArtLoading}
                      setArt={setArt}
                      resetAlbumArt={resetAlbumArt}
                      initialValues={initialValues}
                      uniqueAlbums={uniqueAlbums}
                      isMulti={isMulti}
                    />
                  </TabsContent>
                  <TabsContent value="bulk-search">
                    <BulkSearchId3EditorPanel
                      songs={selectedSongs}
                      bulkState={bulkState}
                      progress={bulkProgress}
                      isRunning={bulkRunning}
                      onStart={startBulkSearch}
                      onCancel={cancelBulkSearch}
                      previewMatch={previewMatch}
                      selectMatch={selectMatch}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
