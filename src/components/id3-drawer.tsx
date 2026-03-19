"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
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

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import type { Id3FormValues, Song } from "@/models";
import { ImagePlusIcon } from "lucide-react";
import { getStaticThumbnail } from "@/hooks/thumbnailQueryHooks";

type Id3DrawerProps = {
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedSong: Song | undefined;
  className?: string | null;
  onSave?: (songId: string, values: Id3FormValues) => void;
};

export function Id3Drawer({
  isOpen,
  selectedSong,
  onOpenChange,
  onSave,
  className,
}: Id3DrawerProps) {
  const form = useForm<Id3FormValues>({
    defaultValues: {
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
    },
  });

  useEffect(() => {
    if (isOpen && selectedSong) {
      let cleanup: (() => void) | undefined;

      async function loadArt() {
        if (!isOpen || !selectedSong) {
          return;
        }

        const art = await getStaticThumbnail(selectedSong.id);
        if (!art.thumb128Url) return;

        form.setValue("picture", [art.thumb128Url]);

        cleanup = art.revoke;
      }

      loadArt();

      form.reset({
        title: selectedSong.tags?.title,
        artist: selectedSong.tags?.artist,
        album: selectedSong.tags?.album,
        albumArtist: selectedSong.tags?.albumArtist,
        track: selectedSong.tags?.track,
        disc: selectedSong.tags?.disc,
        year: selectedSong.tags?.year,
        genre: selectedSong.tags?.genre,
        comment: selectedSong.tags?.comment,
        composer: selectedSong.tags?.composer,
        bpm: selectedSong.tags?.bpm,
        lyrics: selectedSong.tags?.lyrics,
        copyright: selectedSong.tags?.copyright,
        encoder: selectedSong.tags?.encoder,
        picture: [],
      });

      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [isOpen, selectedSong, getStaticThumbnail, form]);

  function handleSubmit(values: Id3FormValues) {
    if (!selectedSong) return;
    onSave?.(selectedSong.id, values);
    onOpenChange?.(false);
  }

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent
        className={`id3-drawer max-h-[90vh] overflow-y-auto after:hidden ${className ?? ""}`}
      >
        <DrawerHeader>
          <DrawerTitle>Edit ID3 tags</DrawerTitle>
          <DrawerDescription>
            Update the metadata for the selected song.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-8 lg:w-4xl mx-auto"
            >
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="md:row-span-3 lg:row-span-3 flex flex-col items-start">
                    <FormField
                      control={form.control}
                      name="picture"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <label
                            htmlFor="album-art-input"
                            className="
                              relative w-32 h-32 rounded border bg-muted 
                              flex items-center justify-center overflow-hidden 
                              cursor-pointer group
                            "
                          >
                            {form.watch("picture")?.length || 0 > 0 ? (
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
                            onChange={(e) => {
                              const files = e.target.files;
                              if (!files) return;
                              let encodedFiles: string[] = [];
                              for (const file of files) {
                                encodedFiles.push(URL.createObjectURL(file));
                              }
                              field.onChange(encodedFiles[0]);
                            }}
                          />

                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                      key={name}
                      control={form.control}
                      name={name as keyof Id3FormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
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
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
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
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
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
                        <Textarea rows={2} {...field} />
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
                        <Textarea rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DrawerFooter className="px-0">
                <Button type="submit">Save</Button>
                <DrawerClose asChild>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
