"use client";

import { Textarea } from "@/components/ui/textarea";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AlbumArtField } from "../fields/album-art-field";
import { TextFieldRow } from "../fields/text-field-row";
import { getUniqueValues } from "@/lib/utils";
import type { Id3FormValues, Song } from "@/models";

type ManualId3EditorPanelProps = {
  selectedSongs: Song[];
  form: any;
  dirty: Record<string, boolean>;
  markDirty: (key: keyof Id3FormValues, value: any) => void;
  resetField: (key: keyof Id3FormValues, form: any) => void;

  previewArt: string | null;
  isAlbumArtLoading: boolean;
  setArt: (bytes: Uint8Array) => void;
  resetAlbumArt: () => void;

  initialValues: Id3FormValues;
  uniqueAlbums: string[];
  isMulti: boolean;
};

export function ManualId3EditorPanel(props: ManualId3EditorPanelProps) {
  const {
    selectedSongs,
    form,
    dirty,
    markDirty,
    resetField,
    previewArt,
    isAlbumArtLoading,
    setArt,
    resetAlbumArt,
    initialValues,
    uniqueAlbums,
    isMulti,
  } = props;

  return (
    <div className="flex flex-col gap-3 w-full">
      <details className="cursor-pointer my-2" hidden={!isMulti}>
        <summary className="text-sm text-muted-foreground">
          Editing {selectedSongs.length} selected songs together
        </summary>

        <ul className="mt-2 max-h-40 overflow-y-auto border rounded p-2 text-sm">
          {selectedSongs.map((song) => (
            <li key={song.id} className="py-0.5">
              {song.tags?.title || song.id}
              {song.tags?.artist ? ` - ${song.tags.artist}` : ""}
            </li>
          ))}
        </ul>
      </details>

      <hr hidden={!isMulti} />

      <div className="my-2">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="md:row-span-3 lg:row-span-3 flex flex-col items-start">
            <AlbumArtField
              previewArt={previewArt}
              dirty={!!dirty.picture}
              isLoading={isAlbumArtLoading}
              disabled={
                uniqueAlbums.length > 1 &&
                !dirty.album &&
                !(
                  initialValues.album !== undefined &&
                  initialValues.album.length > 0
                )
              }
              labelText={
                uniqueAlbums.length > 1 && !dirty.album
                  ? "Multiple Albums Selected"
                  : "No Album Art"
              }
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
                  initialValues[fieldName] === "" && isMulti
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
                    initialValues.comment === "" ? "Multiple values" : undefined
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
                    initialValues.lyrics === "" ? "Multiple values" : undefined
                  }
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
