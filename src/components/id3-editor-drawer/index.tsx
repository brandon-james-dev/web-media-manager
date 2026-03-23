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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

import {
  SaveIcon,
  ListRestartIcon,
  DownloadCloudIcon,
  XIcon,
} from "lucide-react";

import type { Id3FormValues, Song } from "@/models";
import { getUniqueValues } from "@/lib/utils";

import { TextFieldRow } from "./fields/text-field-row";
import { AlbumArtField } from "./fields/album-art-field";

import { OnlineSrcPreSearchDialog } from "./dialogs/online-src-presearch-dialog";
import { OnlineSrcResultsDialog } from "./dialogs/online-src-results-dialog";

import { useDirtyFields } from "./state/useDirtyFields";
import { useAlbumArt } from "./state/useAlbumArt";

import { applyItunesMetadata } from "./online-src-helpers/applyItunesMetaData";
import { getItunesSong } from "./online-src-helpers/getItunesSong";
import { getStaticThumbnail } from "@/hooks/thumbnailQueryHooks";
import type { MusicResult } from "itunes-web-api";

type Id3EditorDrawerProps = {
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedSongs: Song[];
  className?: string | null;
  onSave?: (updatedSongs: Song[], pendingAlbumArt: Uint8Array | null) => void;
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
  const primarySong = selectedSongs[0];

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
    pendingRef: pendingAlbumArtRef,
    resetAlbumArt,
    setArt,
  } = useAlbumArt(primarySong, form);

  const [itunesPreSearchOpen, setItunesPreSearchOpen] = useState(false);
  const [preSearchTitle, setPreSearchTitle] = useState("");
  const [preSearchArtist, setPreSearchArtist] = useState("");
  const [preSearchAlbum, setPreSearchAlbum] = useState("");

  const [itunesResults, setItunesResults] = useState<MusicResult[]>([]);
  const [itunesModalOpen, setItunesModalOpen] = useState(false);

  async function handleApplyItunes(result: MusicResult) {
    await applyItunesMetadata(
      result,
      form,
      markDirty,
      setPreviewArt,
      setIsAlbumArtLoading,
      pendingAlbumArtRef,
    );
  }

  async function handleGetItunesSong(
    title: string,
    artist?: string,
    album?: string,
  ) {
    await getItunesSong(
      title,
      artist,
      album,
      handleApplyItunes,
      setItunesResults,
      setItunesModalOpen,
    );
  }

  useEffect(() => {
    if (!isOpen || !selectedSongs.length) return;

    form.reset(initialValues);
    setPreviewArt(null);
    setIsAlbumArtLoading(false);

    let cleanup: (() => void) | undefined;

    async function loadArt() {
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
      const next = { ...song, tags: { ...song.tags } as any };

      for (const key in dirty) {
        if (key !== "picture") {
          next.tags[key] = values[key as keyof Id3FormValues];
        }
      }

      return next;
    });

    onSave?.(updated, pendingAlbumArtRef.current);
    onOpenChange?.(false);
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
      handleGetItunesSong(song.tags!.title!, artist);
    }
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
                          type="submit"
                          className="bg-blue-500 hover:bg-blue-800 text-white"
                          disabled={
                            Object.keys(dirty).length === 0 || isAlbumArtLoading
                          }
                        >
                          <SaveIcon />
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
                          disabled={Object.keys(dirty).length === 0}
                          type="reset"
                          onClick={() =>
                            resetAllDirtyFields(form, resetAlbumArt)
                          }
                        >
                          <ListRestartIcon />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reset Changes</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" onClick={initiatePreSearch}>
                          <DownloadCloudIcon />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Find song metadata from online sources</p>
                      </TooltipContent>
                    </Tooltip>

                    <DrawerClose asChild>
                      <Button variant="outline" type="button">
                        <XIcon />
                      </Button>
                    </DrawerClose>
                  </div>
                </div>
              </DrawerHeader>

              <div className="space-y-8 lg:w-4xl mx-auto">
                <div className="mt-2" hidden={!isMulti}>
                  <details className="cursor-pointer">
                    <summary className="text-sm text-muted-foreground">
                      {selectedSongs.length} selected songs
                    </summary>

                    <ul className="mt-2 max-h-40 overflow-y-auto border rounded p-2 text-sm">
                      {selectedSongs.map((song) => (
                        <li key={song.id} className="py-0.5">
                          {song.tags?.title || song.id} — {song.tags?.artist}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>

                <div>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="md:row-span-3 lg:row-span-3 flex flex-col items-start">
                      <AlbumArtField
                        previewArt={previewArt}
                        dirty={!!dirty.picture}
                        isLoading={isAlbumArtLoading}
                        downloadComplete={false}
                        onSelectFile={(bytes) => {
                          setArt(bytes);
                          markDirty("picture", bytes);
                        }}
                        onReset={resetAlbumArt}
                      />
                    </div>

                    {[
                      ["title", "Title"],
                      ["artist", "Artist"],
                      ["album", "Album"],
                      ["albumArtist", "Album Artist"],
                      ["year", "Year"],
                      ["genre", "Genre"],
                    ].map(([name, label]) => {
                      const fieldName = name as keyof Id3FormValues;
                      const uniqueValues = getUniqueValues(
                        fieldName as keyof Song["tags"],
                        selectedSongs,
                      );

                      return (
                        <TextFieldRow
                          key={name}
                          name={name}
                          label={label}
                          value={form.watch(fieldName)}
                          onChange={(v) => {
                            form.setValue(fieldName, v);
                            markDirty(fieldName, v);
                          }}
                          dirty={!!dirty[fieldName]}
                          onReset={() => resetField(fieldName, form)}
                          uniqueValues={uniqueValues}
                          placeholder={
                            initialValues[fieldName] === ""
                              ? "Multiple values"
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Track Position</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      ["track", "Track Number"],
                      ["disc", "Disc Number"],
                    ].map(([name, label]) => {
                      const fieldName = name as keyof Id3FormValues;
                      const uniqueValues = getUniqueValues(
                        fieldName as keyof Song["tags"],
                        selectedSongs,
                      );

                      return (
                        <TextFieldRow
                          key={name}
                          name={name}
                          label={label}
                          value={form.watch(fieldName)}
                          onChange={(v) => {
                            form.setValue(fieldName, v);
                            markDirty(fieldName, v);
                          }}
                          dirty={!!dirty[fieldName]}
                          onReset={() => resetField(fieldName, form)}
                          uniqueValues={uniqueValues}
                          placeholder={
                            initialValues[fieldName] === ""
                              ? "Multiple values"
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Credits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      ["composer", "Composer"],
                      ["bpm", "BPM"],
                      ["copyright", "Copyright"],
                      ["encoder", "Encoder"],
                    ].map(([name, label]) => {
                      const fieldName = name as keyof Id3FormValues;
                      const uniqueValues = getUniqueValues(
                        fieldName as keyof Song["tags"],
                        selectedSongs,
                      );

                      return (
                        <TextFieldRow
                          key={name}
                          name={name}
                          label={label}
                          value={form.watch(fieldName)}
                          onChange={(v) => {
                            form.setValue(fieldName, v);
                            markDirty(fieldName, v);
                          }}
                          dirty={!!dirty[fieldName]}
                          onReset={() => resetField(fieldName, form)}
                          uniqueValues={uniqueValues}
                          placeholder={
                            initialValues[fieldName] === ""
                              ? "Multiple values"
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Text Fields</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={"comment" as keyof Id3FormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Comment
                            <button
                              type="button"
                              hidden={!dirty.comment}
                              onClick={() => resetField("comment", form)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Reset
                            </button>
                          </FormLabel>
                          <Textarea
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v);
                              markDirty("comment", v);
                            }}
                            placeholder={
                              initialValues.comment === ""
                                ? "Multiple values"
                                : undefined
                            }
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={"lyrics" as keyof Id3FormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Lyrics
                            <button
                              type="button"
                              hidden={!dirty.lyrics}
                              onClick={() => resetField("lyrics", form)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Reset
                            </button>
                          </FormLabel>
                          <Textarea
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v);
                              markDirty("lyrics", v);
                            }}
                            placeholder={
                              initialValues.lyrics === ""
                                ? "Multiple values"
                                : undefined
                            }
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
