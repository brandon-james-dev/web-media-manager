"use client";

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

type Id3DrawerProps = {
    isOpen: boolean;
    onOpenChange?: (open: boolean) => void;
    selectedSong?: Song | null;
    className?: string | null;
    onSave?: (songId: string, values: Id3FormValues) => void;
};

export function Id3Drawer(props: Id3DrawerProps) {
    const { isOpen, selectedSong, onOpenChange, onSave } = props;

    const form = useForm<Id3FormValues>({
        defaultValues: {
            title: "",
            artist: "",
            album: "",
            albumArtist: "",
            track: "",
            disc: "",
            year: "",
            genre: "",
            comment: "",
            composer: "",
            bpm: "",
            lyrics: "",
            copyright: "",
            encoder: "",
        },
        values: selectedSong?.tags
            ? {
                  title: selectedSong.tags.title ?? "",
                  artist: selectedSong.tags.artist ?? "",
                  album: selectedSong.tags.album ?? "",
                  albumArtist: selectedSong.tags.albumArtist ?? "",
                  track: selectedSong.tags.track ?? "",
                  disc: selectedSong.tags.disc ?? "",
                  year: selectedSong.tags.year ?? "",
                  genre: selectedSong.tags.genre ?? "",
                  comment: selectedSong.tags.comment ?? "",
                  composer: selectedSong.tags.composer ?? "",
                  bpm: selectedSong.tags.bpm ?? "",
                  lyrics: selectedSong.tags.lyrics ?? "",
                  copyright: selectedSong.tags.copyright ?? "",
                  encoder: selectedSong.tags.encoder ?? "",
              }
            : undefined,
    });

    function handleSubmit(values: Id3FormValues) {
        if (!selectedSong) return;
        onSave?.(selectedSong.id, values);
        onOpenChange?.(false);
    }

    return (
        <Drawer open={isOpen} onOpenChange={onOpenChange}>
            <DrawerContent className="id3-drawer max-h-[90vh] overflow-y-auto after:hidden">
                <DrawerHeader>
                    <DrawerTitle>Edit ID3 tags</DrawerTitle>
                    <DrawerDescription>
                        Update the metadata for the selected song.
                    </DrawerDescription>
                </DrawerHeader>

                <div className={`px-4 pb-4 ${props.className ?? ''}`}>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSubmit)}
                            className="space-y-4 lg:w-4xl mx-auto"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    ["title", "Title"],
                                    ["artist", "Artist"],
                                    ["album", "Album"],
                                    ["albumArtist", "Album Artist"],
                                    ["track", "Track Number"],
                                    ["disc", "Disc Number"],
                                    ["year", "Year"],
                                    ["genre", "Genre"],
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