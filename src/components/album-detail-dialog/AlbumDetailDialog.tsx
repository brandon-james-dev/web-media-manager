import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useArtwork } from "@/hooks";
import { ArtworkType } from "@/lib/metadata-utils";
import { ThumbnailSize } from "@/lib";
import { type Song } from "@/models";
import { Input } from "../ui/input";
import { useState } from "react";
import { Label } from "../ui/label";
import { ChevronLeft, ChevronRight, Eraser, Pen, Save, X } from "lucide-react";
import { Button } from "../ui/button";
import type { AlbumDetailDialogProps } from "./AlbumDetailDialogProps";
import { AlbumArtImage } from "../album-art-image";

export function AlbumDetailDialog(props: AlbumDetailDialogProps) {
  //#region State
  const {
    formId,
    open,
    onOpenChange,
    album,
    onSubmit,
    isNextButtonDisabled,
    isPrevButtonDisabled,
    handleNextClick,
    handlePrevClick,
  } = props;
  const [updatedFrontCover, setUpdatedFrontCover] = useState<Blob | null>(null);
  //#endregion

  //#region Helpers
  function formatLength(length: number | undefined): string {
    if (!length) return "0:00";
    const m = Math.floor(length / 60);
    const s = `${Math.floor(length % 60)}`.padStart(2, "0");
    return `${m}:${s}`;
  }
  //#endregion

  //#region Interactivity handlers
  function handleFormSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onSubmit?.(form);
  }

  function handleOpenChange(open: boolean) {
    setUpdatedFrontCover(null);
    onOpenChange(open);
  }

  function handlePrevClicked() {
    setUpdatedFrontCover(null);
    handlePrevClick?.();
  }

  function handleNextClicked() {
    setUpdatedFrontCover(null);
    handleNextClick?.();
  }
  //#endregion

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-4xl w-full max-h-4/5 p-0 select-none overflow-auto"
      >
        {album && (
          <form
            key={album.id}
            id={formId || "album-details-dialog-form"}
            className="flex flex-col sm:flex-row h-full"
            onSubmit={handleFormSubmit}
          >
            <div className="w-full sm:w-1/3 bg-muted/30 flex flex-col items-center gap-3">
              <div className="w-full aspect-square p-3">
                <Label
                  htmlFor="coverFront"
                  className="border border-muted-foreground
                           h-full
                           flex flex-col justify-center
                           hover:bg-accent/10 cursor-pointer
                           rounded-lg
                          "
                >
                  <div className="relative w-full h-full border rounded-md hover:border-accent group">
                    <Pen
                      size={32}
                      className="
                      absolute top-3 right-3 p-2 rounded-md
                      dark:bg-accent
                      opacity-0
                      group-hover:opacity-100
                      transition-opacity
                    "
                    />
                    {updatedFrontCover ? (
                      <img
                        src={URL.createObjectURL(updatedFrontCover)}
                        alt={album.title}
                        className="object-cover rounded-md border"
                      />
                    ) : (
                      <AlbumArtImage
                        songId={album.pictureSongId}
                        thumbSize={ThumbnailSize.thumb512}
                        fallback={
                          <div
                            className="
                            w-full h-full rounded-md border
                            flex flex-col
                            items-center justify-center
                            text-sm text-foreground text-center
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

              <Input
                hidden
                id="coverFront"
                type="file"
                name="coverFront"
                accept="image/*"
                onChange={(evt) => {
                  const file = evt.currentTarget.files?.[0];

                  if (file) {
                    // Create preview URL
                    setUpdatedFrontCover(file);
                  }
                }}
                className="mt-2"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex justify-between">
                <div className="flex gap-2">
                  {handlePrevClick && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrevClicked}
                      disabled={!!isPrevButtonDisabled}
                    >
                      <ChevronLeft />
                      Prev
                    </Button>
                  )}

                  {handleNextClick && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleNextClicked}
                      disabled={!!isNextButtonDisabled}
                    >
                      Next
                      <ChevronRight />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    type="submit"
                    className="bg-accent/50 hover:bg-accent/70 text-white"
                  >
                    <Save />
                    Save
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    type="reset"
                    className="border-accent/50 hover:border-accent/70 text-white"
                    onClick={() => setUpdatedFrontCover(null)}
                  >
                    <Eraser />
                    Reset
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                  >
                    <X />
                    Close
                  </Button>
                </div>
              </div>
              <DialogHeader>
                <DialogTitle className="mb-3 mt-4 pb-3 flex flex-col gap-1 border-b">
                  <Input
                    type="text"
                    name="albumTitle"
                    className="text-sm md:text-xl"
                    defaultValue={album.title}
                    autoComplete="off"
                  />

                  <Input
                    type="text"
                    name="albumArtist"
                    className="text-sm text-muted-foreground"
                    defaultValue={album.artist}
                    autoComplete="off"
                  />
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-[60px_1fr_60px] bg-muted/40 text-xs font-medium py-1 rounded-md w-full">
                <div>Track</div>
                <div>Title</div>
                <div>Duration</div>
              </div>

              <div className="divide-y w-full">
                {album.songs
                  .sort((a, b) => (a.track ?? 0) - (b.track ?? 0))
                  .map((s, index) => (
                    <div
                      key={s.id}
                      className="grid grid-cols-[60px_1fr_60px] items-center py-1 gap-2"
                    >
                      <Input
                        type="hidden"
                        name={`songs[${index}].id`}
                        className="w-full text-xs border rounded px-1 py-0.5 bg-background"
                        defaultValue={s.id}
                        autoComplete="off"
                      />

                      <Input
                        type="number"
                        name={`songs[${index}].track`}
                        className="w-full text-xs border rounded px-1 py-0.5 bg-background"
                        defaultValue={s.track ?? 0}
                        autoComplete="off"
                      />

                      <Input
                        type="text"
                        name={`songs[${index}].title`}
                        className="w-full text-xs border rounded px-1 py-0.5 bg-background"
                        defaultValue={s.title}
                        autoComplete="off"
                      />

                      <span className="w-full px-1 text-right">
                        {formatLength(s.length)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
