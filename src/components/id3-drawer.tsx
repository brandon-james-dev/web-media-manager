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

import type { Id3FormValues, Song } from "@/models";
import { ImagePlusIcon, SaveIcon, XIcon } from "lucide-react";
import { getStaticThumbnail } from "@/hooks/thumbnailQueryHooks";
import { resizeBitmap } from "@/lib/albumArt";
import { getUniqueValues } from "@/lib/utils";
import { AutocompleteInput } from "./autocomplete-input";

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

  const form = useForm<Id3FormValues>({
    defaultValues: initialValues,
  });

  const [dirty, setDirty] = useState<Record<string, boolean>>({});

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

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent
        className={`id3-drawer max-h-[90vh] overflow-y-auto after:hidden ${className ?? ""}`}
      >
        <div className="px-4 pb-4">
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
                    <Button type="submit">
                      <SaveIcon />
                    </Button>
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
                              className="object-cover w-full h-full"
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
                              <FormLabel>{label}</FormLabel>

                              <AutocompleteInput
                                label={label}
                                value={field.value}
                                onChange={(v) => {
                                  field.onChange(v);
                                  markDirty(name as keyof Id3FormValues);
                                }}
                                uniqueValues={uniqueValues}
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
                              <FormLabel>{label}</FormLabel>

                              <AutocompleteInput
                                label={label}
                                value={field.value}
                                onChange={(v) => {
                                  field.onChange(v);
                                  markDirty(name as keyof Id3FormValues);
                                }}
                                uniqueValues={uniqueValues}
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
                              <FormLabel>{label}</FormLabel>

                              <AutocompleteInput
                                label={label}
                                value={field.value}
                                onChange={(v) => {
                                  field.onChange(v);
                                  markDirty(name as keyof Id3FormValues);
                                }}
                                uniqueValues={uniqueValues}
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
