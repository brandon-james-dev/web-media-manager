import { useArtwork } from "@/hooks";
import { ArtworkType } from "@/lib/metadata-utils";
import type { Song } from "@/models";
import { Save } from "lucide-react";
import { useState } from "react";
import { QuickEditField } from "./QuickEditField";
import { quickEditFields } from "./quickEditFields";
import type { QuickEditFormProps, EditableField } from "./QuickEditFormProps";
import { ThumbnailSize } from "@/lib";
import { Button } from "../ui/button";
import { Label } from "../ui/label";

export function QuickEditForm({ formId, songs, onApply }: QuickEditFormProps) {
  const [values, setValues] = useState<
    Partial<Record<EditableField, string | number>>
  >({});

  const firstSong = songs[0];
  const artwork = useArtwork(
    firstSong.id,
    ArtworkType.FrontCover,
    ThumbnailSize.thumb128
  );
  const [updatedCoverFront, setUpdatedCoverFront] = useState<
    Blob | undefined
  >();

  function getQuickEditArtwork(): string | undefined {
    if (!artwork || artwork.length === 0) return undefined;

    const pic = artwork[0];
    const blob = new Blob([pic.data.slice()], { type: pic.mimeType });

    return URL.createObjectURL(blob);
  }

  function stripEmptyFields<T extends Record<string, any>>(obj: T): Partial<T> {
    const result: Partial<T> = {};

    for (const key in obj) {
      const value = obj[key];

      if (
        value === undefined ||
        value === null ||
        value === "" ||
        (typeof value === "number" && Number.isNaN(value))
      ) {
        continue;
      }

      result[key] = value;
    }

    return result;
  }

  function handleQuickEditFormSubmit(
    event: React.SubmitEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const rawUpdates = {
      ...values,
      coverFront: updatedCoverFront,
    };

    const updates = stripEmptyFields(rawUpdates) as Partial<Song>;

    onApply(updates);

    setValues({});
    setUpdatedCoverFront(undefined);
  }

  return (
    <>
      <form
        id={formId || "quick-edit-form"}
        className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_1fr] gap-2 w-full"
        onSubmit={handleQuickEditFormSubmit}
      >
        <div className="row-span-2 flex flex-col items-center gap-2">
          <Label className="text-xs font-medium text-muted-foreground mt-1">
            Album Art
          </Label>

          <input
            id="quick-edit-art-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              const blob = file.slice(0, file.size, file.type);
              setUpdatedCoverFront(blob);
            }}
          />

          <label
            htmlFor="quick-edit-art-input"
            className="relative w-24 h-24 cursor-pointer"
          >
            {songs.length > 1 && (
              <>
                <div className="absolute inset-0 rounded-md bg-secondary-foreground opacity-20 translate-x-1 translate-y-1" />
                <div className="absolute inset-0 rounded-md bg-secondary-foreground opacity-40 translate-x-2 translate-y-2" />
              </>
            )}

            {updatedCoverFront ? (
              <img
                src={URL.createObjectURL(updatedCoverFront)}
                alt="Album Art"
                className="absolute inset-0 w-full h-full object-cover rounded-md shadow pointer-events-none"
              />
            ) : getQuickEditArtwork() ? (
              <img
                src={getQuickEditArtwork()}
                alt="Album Art"
                className="absolute inset-0 w-full h-full object-cover rounded-md shadow pointer-events-none"
              />
            ) : (
              <div className="absolute inset-0 rounded-md border flex items-center justify-center text-sm text-muted-foreground bg-background pointer-events-none">
                No Art
              </div>
            )}
          </label>
        </div>

        {quickEditFields.map((field) => (
          <QuickEditField
            key={field}
            field={field}
            songs={songs}
            value={values[field]}
            onChange={(v) =>
              setValues((prev) => ({
                ...prev,
                [field]: v,
              }))
            }
          />
        ))}
      </form>

      <div
        className={`flex justify-end mt-4 ${formId != undefined ? "hidden" : ""}`}
      >
        <Button
          type="submit"
          form={formId || "quick-edit-form"}
          className="bg-accent hover:bg-accent/70 text-white"
          variant="default"
        >
          <Save />
          Apply to {songs.length} songs
        </Button>
      </div>
    </>
  );
}
