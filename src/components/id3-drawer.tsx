"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { getSong, type MusicResult } from "itunes-web-api";

import type { Id3FormValues, Song } from "@/models";
import {
  DownloadCloudIcon,
  ImagePlusIcon,
  ListRestartIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { getStaticThumbnail } from "@/hooks/thumbnailQueryHooks";
import { downloadImageBytes, resizeBitmap } from "@/lib/albumArt";
import { arrayBufferToBase64, getUniqueValues } from "@/lib/utils";
import { AutocompleteInput } from "./autocomplete-input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Id3DrawerProps = {
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

export function Id3Drawer({
  isOpen,
  selectedSongs,
  onOpenChange,
  onSave,
  className,
}: Id3DrawerProps) {
  const isMulti = selectedSongs.length > 1;
  const primarySong = selectedSongs[0];
  const [previewArt, setPreviewArt] = useState<string | null>(null);
  const pendingAlbumArtRef = useRef<Uint8Array | null>(null);

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

  const [itunesPreSearchOpen, setItunesPreSearchOpen] = useState(false);
  const [preSearchTitle, setPreSearchTitle] = useState("");
  const [preSearchArtist, setPreSearchArtist] = useState("");
  const [preSearchAlbum, setPreSearchAlbum] = useState("");
  const [itunesResults, setItunesResults] = useState<MusicResult[]>([]);
  const [itunesModalOpen, setItunesModalOpen] = useState(false);

  async function applyItunesMetadata(result: MusicResult) {
    if (result.trackName) {
      form.setValue("title", result.trackName);
      markDirty("title");
    }

    if (result.artistName) {
      form.setValue("artist", result.artistName);
      markDirty("artist");
    }

    if (result.collectionName) {
      form.setValue("album", result.collectionName);
      markDirty("album");
    }

    if (result.primaryGenreName) {
      form.setValue("genre", result.primaryGenreName);
      markDirty("genre");
    }

    if (result.releaseDate) {
      const year = new Date(result.releaseDate).getFullYear();
      form.setValue("year", year);
      markDirty("year");
    }

    if (result.artworkUrl100) {
      const bestQualityAlbumArt = result.artworkUrl100.replace("100x100bb", "3000x3000bb");
      const imageBytes = await downloadImageBytes(bestQualityAlbumArt);
      const imageBlob = new Blob([imageBytes] as BlobPart[], { type: "image/jpeg" });
      const imageBitmap = await createImageBitmap(imageBlob);
      const imageDataForUpdate = arrayBufferToBase64(await imageBlob.arrayBuffer());
      const imageDataBlobForPreview = await resizeBitmap(imageBitmap, 128);
      form.setValue("picture", [imageDataForUpdate]);
      setPreviewArt(URL.createObjectURL(imageDataBlobForPreview));
      pendingAlbumArtRef.current = imageBytes;
      markDirty("picture");
    }
  }

  const form = useForm<Id3FormValues>({
    defaultValues: initialValues,
  });

  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  function resetField(name: keyof Id3FormValues) {
    const original = initialValues[name];
    form.setValue(name, original);
    setDirty((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function resetAlbumArt() {
    if (!primarySong) return;

    const art = await getStaticThumbnail(primarySong.id);

    if (art.thumbLarge) {
      setPreviewArt(art.thumbLarge);
      form.setValue("picture", [art.thumbLarge]);
    } else {
      setPreviewArt(null);
      form.setValue("picture", undefined);
    }

    pendingAlbumArtRef.current = null;

    setDirty((prev) => {
      const next = { ...prev };
      delete next.picture;
      return next;
    });
  }

  function resetAllDirtyFields() {
    const nextDirty = { ...dirty };

    for (const key in nextDirty) {
      const k = key as keyof Id3FormValues;
      form.setValue(k, initialValues[k]);
      delete nextDirty[key];
    }

    resetAlbumArt();
    setDirty({});
  }

  const getItunesSong = async (
    title: string,
    album?: string,
    artist?: string,
  ) => {
    const queryParts = [title];

    if (artist) queryParts.push(artist);
    if (album) queryParts.push(album);

    const query = queryParts.join(" ").trim();

    const results = await getSong(query, {
      language: "en",
      country: "US",
      limit: 25,
    });

    if (!results || results.resultCount === 0) {
      console.warn("No iTunes results found");
      return;
    }

    if (results.resultCount === 1) {
      await applyItunesMetadata(results.results[0]);
      return;
    }

    setItunesResults(results.results);
    setItunesModalOpen(true);
  };

  useEffect(() => {
    if (!isOpen || !selectedSongs.length) return;

    form.reset(initialValues);
    setDirty({});

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

  function markDirty(name: keyof Id3FormValues) {
    setDirty((prev) => ({ ...prev, [name]: true }));
  }

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

  const initiatePreSearch = () => {
    const title = form.getValues("title");
    const artist = form.getValues("artist") || form.getValues("albumArtist");

    if (!title || !artist) {
      setPreSearchTitle(title || "");
      setPreSearchArtist(artist || "");
      setItunesPreSearchOpen(true);
      return;
    }

    getItunesSong(title, artist);
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent
        className={`id3-drawer max-h-[90vh] overflow-y-auto after:hidden ${className ?? ""}`}
      >
        <div className="px-4 pb-4">
          <Dialog
            open={itunesPreSearchOpen}
            onOpenChange={setItunesPreSearchOpen}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Enter song info</DialogTitle>
                <DialogDescription>
                  Title and artist are required before searching iTunes.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <input
                    className="w-full border rounded px-2 py-1 mt-1"
                    value={preSearchTitle}
                    onChange={(e) => setPreSearchTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Artist</label>
                  <input
                    className="w-full border rounded px-2 py-1 mt-1"
                    value={preSearchArtist}
                    onChange={(e) => setPreSearchArtist(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Album (optional)
                  </label>
                  <input
                    className="w-full border rounded px-2 py-1 mt-1"
                    value={preSearchAlbum}
                    onChange={(e) => setPreSearchAlbum(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setItunesPreSearchOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  onClick={() => {
                    setItunesPreSearchOpen(false);
                    getItunesSong(
                      preSearchTitle,
                      preSearchAlbum,
                      preSearchArtist,
                    );
                  }}
                >
                  Search
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={itunesModalOpen} onOpenChange={setItunesModalOpen}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select the correct iTunes match</DialogTitle>
                <DialogDescription>
                  Multiple results were found. Choose the correct one below.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 mt-4">
                {itunesResults.map((r) => {
                  const thumb = r.artworkUrl100
                    ? r.artworkUrl100.replace("100x100bb", "60x60bb")
                    : null;

                  return (
                    <button
                      key={r.trackId}
                      type="button"
                      className="w-full flex items-center gap-3 p-3 border rounded hover:bg-muted transition text-left"
                      onClick={async () => {
                        await applyItunesMetadata(r);
                        setItunesModalOpen(false);
                      }}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={r.trackName}
                          className="w-12 h-12 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          No Art
                        </div>
                      )}

                      <div className="flex flex-col">
                        <span className="font-medium">{r.trackName}</span>
                        <span className="text-sm text-muted-foreground">
                          {r.artistName} — {r.collectionName}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setItunesModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                        <Button type="submit">
                          <SaveIcon />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Save Changes</p>
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          className="border border-neutral-600"
                          type="reset"
                          onClick={resetAllDirtyFields}
                        >
                          <ListRestartIcon />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reset Changes</p>
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
                      <div className="w-full">
                        <div className="flex items-center justify-start gap-3 w-full mb-1">
                          <span className="text-sm font-medium">Album Art</span>

                          <button
                            type="button"
                            onClick={resetAlbumArt}
                            hidden={!dirty.picture}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Reset
                          </button>
                        </div>
                        <label
                          htmlFor="album-art-input"
                          className="
                            relative w-32 h-32 rounded border bg-muted 
                            flex items-center justify-center overflow-hidden 
                            cursor-pointer group
                          "
                        >
                          {previewArt ? (
                            <img
                              src={previewArt}
                              alt="Album Art"
                              className={`object-cover w-full h-full ${dirty.picture ? 'border border-blue-400': ''}`}
                            />
                          ) : form.watch("picture") ? (
                            <img
                              src={form.watch("picture")?.at(0)}
                              alt="Album Art"
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="flex flex-col gap-0.5 items-center">
                              <div className="text-sm text-muted-foreground">
                                No Album Art
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Click to Select
                              </div>
                            </div>
                          )}

                          <div
                            className="
                              absolute inset-0 bg-black/40 opacity-0 
                              group-hover:opacity-100 transition-opacity 
                              flex items-center justify-center text-white text-sm
                            "
                          >
                            <ImagePlusIcon />
                          </div>
                        </label>

                        <input
                          id="album-art-input"
                          type="file"
                          accept="image/png, image/jpeg"
                          className="hidden"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || !files[0]) return;
                            if (!primarySong || !primarySong.fileHandle) return;

                            const file = files[0];
                            const buf = await file.arrayBuffer();
                            const bytes = new Uint8Array(buf);
                            const originalBlob = new Blob([bytes]);

                            const bitmap =
                              await createImageBitmap(originalBlob);
                            const resizedAlbumArt = await resizeBitmap(
                              bitmap,
                              128,
                            );

                            const previewUrl =
                              URL.createObjectURL(resizedAlbumArt);
                            setPreviewArt(previewUrl);
                            markDirty("picture");
                            pendingAlbumArtRef.current = bytes;
                          }}
                        />
                      </div>
                    </div>

                    {[
                      ["title", "Title"],
                      ["artist", "Artist"],
                      ["album", "Album"],
                      ["albumArtist", "Album Artist"],
                      ["year", "Year"],
                      ["genre", "Genre"],
                    ].map(([name, label]) => (
                      <FormField
                        control={form.control}
                        name={name as keyof Id3FormValues}
                        render={({ field }) => {
                          const uniqueValues = getUniqueValues(
                            name as keyof Song["tags"],
                            selectedSongs,
                          );

                          return (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                {label}

                                <button
                                  type="button"
                                  hidden={!dirty[name]}
                                  onClick={() =>
                                    resetField(name as keyof Id3FormValues)
                                  }
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  Reset
                                </button>
                              </FormLabel>

                              <AutocompleteInput
                                value={field.value}
                                onChange={(v) => {
                                  field.onChange(v);
                                  markDirty(name as keyof Id3FormValues);
                                }}
                                uniqueValues={uniqueValues}
                                className={
                                  dirty[name]
                                    ? "focus-visible:border-blue-400 focus-visible:ring-blue-400/50 border-blue-500"
                                    : ""
                                }
                                placeholder={
                                  initialValues[name as keyof Id3FormValues] ===
                                  ""
                                    ? "Multiple values"
                                    : undefined
                                }
                              />

                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Track Position</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      ["track", "Track Number"],
                      ["disc", "Disc Number"],
                    ].map(([name, label]) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name as keyof Id3FormValues}
                        render={({ field }) => {
                          const uniqueValues = getUniqueValues(
                            name as keyof Song["tags"],
                            selectedSongs,
                          );

                          return (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                {label}

                                <button
                                  type="button"
                                  hidden={!dirty[name]}
                                  onClick={() =>
                                    resetField(name as keyof Id3FormValues)
                                  }
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  Reset
                                </button>
                              </FormLabel>

                              <AutocompleteInput
                                value={field.value}
                                onChange={(v) => {
                                  field.onChange(v);
                                  markDirty(name as keyof Id3FormValues);
                                }}
                                uniqueValues={uniqueValues}
                                className={
                                  dirty[name]
                                    ? "focus-visible:border-blue-400 focus-visible:ring-blue-400/50 border-blue-500"
                                    : ""
                                }
                                placeholder={
                                  initialValues[name as keyof Id3FormValues] ===
                                  ""
                                    ? "Multiple values"
                                    : undefined
                                }
                              />

                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    ))}
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
                    ].map(([name, label]) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name as keyof Id3FormValues}
                        render={({ field }) => {
                          const uniqueValues = getUniqueValues(
                            name as keyof Song["tags"],
                            selectedSongs,
                          );

                          return (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                {label}

                                <button
                                  type="button"
                                  hidden={!dirty[name]}
                                  onClick={() =>
                                    resetField(name as keyof Id3FormValues)
                                  }
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  Reset
                                </button>
                              </FormLabel>

                              <AutocompleteInput
                                value={field.value}
                                onChange={(v) => {
                                  field.onChange(v);
                                  markDirty(name as keyof Id3FormValues);
                                }}
                                uniqueValues={uniqueValues}
                                className={
                                  dirty[name]
                                    ? "focus-visible:border-blue-400 focus-visible:ring-blue-400/50 border-blue-500"
                                    : ""
                                }
                                placeholder={
                                  initialValues[name as keyof Id3FormValues] ===
                                  ""
                                    ? "Multiple values"
                                    : undefined
                                }
                              />

                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Extended</h3>

                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comment</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            {...field}
                            placeholder={
                              initialValues.comment === ""
                                ? "Multiple values"
                                : undefined
                            }
                            onChange={(e) => {
                              field.onChange(e);
                              markDirty("comment");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lyrics"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lyrics</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            {...field}
                            placeholder={
                              initialValues.lyrics === ""
                                ? "Multiple values"
                                : undefined
                            }
                            onChange={(e) => {
                              field.onChange(e);
                              markDirty("lyrics");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
