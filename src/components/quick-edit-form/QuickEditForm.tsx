import type { Song } from "@/models";
import { Pen, Save } from "lucide-react";
import { useState } from "react";
import { QuickEditField } from "./QuickEditField";
import { quickEditFields } from "./quickEditFields";
import type { QuickEditFormProps, EditableField } from "./QuickEditFormProps";
import { ThumbnailSize } from "@/lib";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { AlbumArtImage } from "../album-art-image";

export function QuickEditForm({ formId, songs, onApply }: QuickEditFormProps) {
  //#region State
  const [values, setValues] = useState<
    Partial<Record<EditableField, string | number>>
  >({});
  const [updatedFrontCover, setUpdatedFrontCover] = useState<Blob | null>(null);
  //#endregion

  //#region Helpers
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
  //#endregion

  //#region Interactivity handlers
  function handleQuickEditFormSubmit(
    event: React.SubmitEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const rawUpdates = {
      ...values,
      coverFront: updatedFrontCover,
    };

    const updates = stripEmptyFields(rawUpdates) as Partial<Song>;

    onApply(updates);

    setValues({});
    setUpdatedFrontCover(null);
  }
  //#endregion

  return (
    <>
      <form
        id={formId || "quick-edit-form"}
        className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_1fr] gap-2 w-full"
        onSubmit={handleQuickEditFormSubmit}
        onReset={() => setUpdatedFrontCover(null)}
      >
        <div className="row-span-2 flex flex-col items-center gap-2">
          <Label className="text-xs font-medium text-muted-foreground mt-1">
            Album Art
          </Label>

          <input
            id="quick-edit-art-input"
            name="quick-edit-cover-front"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              const blob = file.slice(0, file.size, file.type);
              setUpdatedFrontCover(blob);
            }}
          />

          <Label
            htmlFor="quick-edit-art-input"
            className="relative w-24 aspect-square cursor-pointer"
          >
            {songs.length > 1 && (
              <>
                <div className="absolute inset-0 rounded-md bg-secondary-foreground opacity-20 translate-x-1 translate-y-1" />
                <div className="absolute inset-0 rounded-md bg-secondary-foreground opacity-40 translate-x-2 translate-y-2" />
              </>
            )}
            <div className="relative w-full h-full border rounded-md hover:border-accent group">
              <Pen
                size={24}
                className="
                  absolute top-1 right-1 p-1 rounded-md
                  dark:bg-accent
                  opacity-0
                  group-hover:opacity-100
                  transition-opacity
                "
              />

              {updatedFrontCover ? (
                <img
                  src={URL.createObjectURL(updatedFrontCover)}
                  alt={songs[0].album}
                  className="object-cover rounded-md border"
                />
              ) : (
                <AlbumArtImage
                  songId={songs[0].id}
                  thumbSize={ThumbnailSize.thumb256}
                  fallback={
                    <div
                      className="w-full h-full rounded-md border
                                 flex flex-col
                                 items-center justify-center
                                 text-xs text-foreground text-center
                                 bg-background
                                "
                    >
                      <div>No cover art</div>
                      <div className="text-muted-foreground">
                        Click to select
                      </div>
                    </div>
                  }
                />
              )}
            </div>
          </Label>
        </div>

        {quickEditFields.map((field) => (
          <QuickEditField
            key={field}
            field={field}
            songs={songs}
            value={values[field]}
            name={`quick-edit-${field}`}
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
