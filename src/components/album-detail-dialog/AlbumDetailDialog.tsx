import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThumbnailSize } from "@/lib";
import { formatLength } from "@/lib/formatLength";
import { Input } from "../ui/input";
import { useRef, useState } from "react";
import { Label } from "../ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  Globe,
  Images,
  Pen,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import type { AlbumDetailDialogProps } from "./AlbumDetailDialogProps";
import type { AlbumDetailDto } from "@/dto";
import { AlbumArtImage } from "../album-art-image";
import { useTranslation } from "@/i18n";
import AlbumOnlineSearchPanel from "../online-search-panel/AlbumOnlineSearchPanel";
import AlbumArtSearchPanel from "../online-search-panel/AlbumArtSearchPanel";
import type { IPicture } from "@/lib/contracts";
import type { IOnlineAlbumMetadata } from "@/lib/metadata-providers/online/IOnlineAlbumMetadata";
import { fetchCoverBlob } from "@/lib/metadata-providers/online/fetchCoverBlob";
import { matchAlbumTracks } from "./matchAlbumTracks";
import { TrackInfoPopover } from "./TrackInfoPopover";
import { useSourceEditable } from "@/lib/hooks/useSourceEditable";
import type { Song } from "@/models";

/** Stable empty list so the editable hook does not re-run without an album. */
const NO_SONGS: Song[] = [];

/** Write a value into an uncontrolled field by its form name. */
function setFormValue(
  form: HTMLFormElement,
  name: string,
  value: string | undefined
) {
  if (value === undefined) return;
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement) field.value = value;
}

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
  const { t } = useTranslation();
  const [updatedFrontCover, setUpdatedFrontCover] = useState<Blob | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [searchMode, setSearchMode] = useState<"metadata" | "art" | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  //#endregion

  // Disable the form when a song's source doesn't allow metadata write-back.
  const editable = useSourceEditable(album?.songs ?? NO_SONGS);

  const sortedSongs = album
    ? [...album.songs].sort((a, b) => (a.track ?? 0) - (b.track ?? 0))
    : [];

  //#region Interactivity handlers
  function handleFormSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const songs = sortedSongs.map((s, index) => ({
      id: s.id,
      track: form.get(`songs[${index}].track`)
        ? Number(form.get(`songs[${index}].track`))
        : undefined,
      title: form.get(`songs[${index}].title`)?.toString() || undefined,
    }));

    const dto: AlbumDetailDto = {
      albumTitle: form.get("albumTitle")?.toString() || undefined,
      albumArtist: form.get("albumArtist")?.toString() || undefined,
      songs,
      coverFront: updatedFrontCover ?? undefined,
      removeCoverFront: removeCover || undefined,
    };

    onSubmit?.(dto);
  }

  async function handleSearchResultConfirm(
    result: IOnlineAlbumMetadata,
    applyMetadata: boolean
  ) {
    const cover = await fetchCoverBlob(
      result.pictures?.find((p) => p.type === "FrontCover")
    );
    if (cover) setUpdatedFrontCover(cover);

    // Without metadata the lookup only supplies the album art; the track
    // rows keep whatever the user already has.
    if (applyMetadata && formRef.current) {
      const form = formRef.current;
      setFormValue(form, "albumTitle", result.title);
      setFormValue(
        form,
        "albumArtist",
        result.albumArtist ?? result.artist ?? ""
      );

      const matches = matchAlbumTracks(sortedSongs, result.tracks ?? []);
      matches.forEach((match, index) => {
        if (!match) return;
        setFormValue(
          form,
          `songs[${index}].track`,
          match.track != null ? String(match.track) : undefined
        );
        setFormValue(form, `songs[${index}].title`, match.title);
      });
    }

    setSearchMode(null);
  }

  /** Pick a cover from the art grid: same effect as choosing a file. */
  async function handleArtSelect(picture: IPicture) {
    const cover = await fetchCoverBlob(picture);
    if (cover) {
      setUpdatedFrontCover(cover);
      setRemoveCover(false);
    }
    setSearchMode(null);
  }

  function handleRemoveCover() {
    setUpdatedFrontCover(null);
    setRemoveCover(true);
  }

  function toggleSearch(mode: "metadata" | "art") {
    setSearchMode((current) => (current === mode ? null : mode));
  }

  function handleOpenChange(open: boolean) {
    setUpdatedFrontCover(null);
    setRemoveCover(false);
    setSearchMode(null);
    onOpenChange(open);
  }

  function handlePrevClicked() {
    setUpdatedFrontCover(null);
    setRemoveCover(false);
    setSearchMode(null);
    handlePrevClick?.();
  }

  function handleNextClicked() {
    setUpdatedFrontCover(null);
    setRemoveCover(false);
    setSearchMode(null);
    handleNextClick?.();
  }
  //#endregion

  const noCoverArt = (
    <div
      className="
        w-full h-full rounded-md border
        flex flex-col
        items-center justify-center
        text-sm text-foreground text-center
        bg-background
      "
    >
      <div>{t("library.noCoverArt")}</div>
      <div className="text-muted-foreground">{t("common.clickToSelect")}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`sm:max-w-4xl w-full p-0 select-none overflow-auto ${
          searchMode ? "max-h-[92vh]" : "max-h-4/5"
        }`}
      >
        {album && (
          <div className="flex flex-col h-full">
            {searchMode && (
              <div className="max-h-[45vh] shrink-0 overflow-y-auto border-b">
                {searchMode === "metadata" ? (
                  <AlbumOnlineSearchPanel
                    album={album}
                    onSelect={handleSearchResultConfirm}
                  />
                ) : (
                  <AlbumArtSearchPanel
                    album={album}
                    onSelect={handleArtSelect}
                  />
                )}
              </div>
            )}

            <form
              key={album.id}
              ref={formRef}
              id={formId || "album-details-dialog-form"}
              className="flex flex-col sm:flex-row h-full"
              onSubmit={handleFormSubmit}
            >
              <div className="w-full sm:w-1/3 bg-muted/30 flex flex-col items-center gap-3">
                <div className="relative w-full aspect-square p-3 group">
                  <Label
                    htmlFor="coverFront"
                    className="border border-muted-foreground
                           h-full
                           flex flex-col justify-center
                           hover:bg-accent/10 cursor-pointer
                           rounded-lg
                          "
                  >
                    <div className="relative w-full h-full border rounded-md hover:border-accent">
                      {updatedFrontCover ? (
                        <img
                          src={URL.createObjectURL(updatedFrontCover)}
                          alt={album.title}
                          className="object-cover rounded-md border"
                        />
                      ) : removeCover ? (
                        noCoverArt
                      ) : (
                        <AlbumArtImage
                          songId={album.pictureSongId}
                          thumbSize={ThumbnailSize.thumb512}
                          fallback={noCoverArt}
                        />
                      )}
                    </div>
                  </Label>

                  {editable && (
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Label
                      htmlFor="coverFront"
                      aria-disabled={!editable}
                      className={`inline-flex size-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground dark:bg-accent dark:text-accent-foreground ${
                        editable ? "cursor-pointer" : "pointer-events-none opacity-50"
                      }`}
                    >
                      <Pen className="size-3.5" />
                    </Label>
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      type="button"
                      onClick={() => toggleSearch("art")}
                      disabled={!editable}
                      aria-label={t("metadata.searchAlbumArt")}
                      title={t("metadata.searchAlbumArt")}
                      className="bg-secondary text-secondary-foreground dark:bg-accent dark:text-accent-foreground"
                    >
                      <Images className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      type="button"
                      onClick={handleRemoveCover}
                      disabled={!editable}
                      aria-label={t("metadata.removeAlbumArt")}
                      title={t("metadata.removeAlbumArt")}
                      className="bg-secondary text-secondary-foreground dark:bg-accent dark:text-accent-foreground"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                    </div>
                  )}
                </div>

                <Input
                  hidden
                  id="coverFront"
                  type="file"
                  name="coverFront"
                  accept="image/*"
                  disabled={!editable}
                  onChange={(evt) => {
                    const file = evt.currentTarget.files?.[0];

                    if (file) {
                      // Create preview URL
                      setUpdatedFrontCover(file);
                      setRemoveCover(false);
                    }
                  }}
                  className="mt-2"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex justify-between">
                  <div className="flex gap-1">
                    <Button
                      variant={
                        searchMode === "metadata" ? "default" : "secondary"
                      }
                      onClick={() => toggleSearch("metadata")}
                      disabled={!editable}
                    >
                      <Globe />
                      {t("metadata.onlineSearch")}
                    </Button>

                    <Button
                      variant="secondary"
                      type="reset"
                      disabled={!editable}
                      className="border-accent/50 hover:border-accent/70"
                      onClick={() => {
                        setUpdatedFrontCover(null);
                        setRemoveCover(false);
                      }}
                    >
                      <Eraser />
                      {t("common.reset")}
                    </Button>

                    <Button
                      variant="default"
                      type="submit"
                      disabled={!editable}
                      className="bg-accent/50 hover:bg-accent/70 text-white"
                    >
                      <Save />
                      {t("common.save")}
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    {handlePrevClick && (
                      <Button
                        variant="secondary"
                        onClick={handlePrevClicked}
                        disabled={!!isPrevButtonDisabled}
                      >
                        <ChevronLeft />
                        {t("common.prev")}
                      </Button>
                    )}

                    {handleNextClick && (
                      <Button
                        variant="secondary"
                        onClick={handleNextClicked}
                        disabled={!!isNextButtonDisabled}
                      >
                        {t("common.next")}
                        <ChevronRight />
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      onClick={() => handleOpenChange(false)}
                    >
                      <X />
                      {t("common.close")}
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
                      disabled={!editable}
                    />

                    <Input
                      type="text"
                      name="albumArtist"
                      className="text-sm text-muted-foreground"
                      defaultValue={album.artist}
                      autoComplete="off"
                      disabled={!editable}
                    />
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-[60px_1fr_60px_28px] bg-muted/40 text-xs font-medium py-1 rounded-md w-full">
                  <div>{t("metadata.track")}</div>
                  <div>{t("metadata.title")}</div>
                  <div>{t("metadata.duration")}</div>
                  <div />
                </div>

                <div className="divide-y w-full">
                  {sortedSongs.map((s, index) => (
                    <div
                      key={s.id}
                      className="grid grid-cols-[60px_1fr_60px_28px] items-center py-1 gap-2"
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
                        disabled={!editable}
                      />

                      <Input
                        type="text"
                        name={`songs[${index}].title`}
                        className="w-full text-xs border rounded px-1 py-0.5 bg-background"
                        defaultValue={s.title}
                        autoComplete="off"
                        disabled={!editable}
                      />

                      <span className="w-full px-1 text-right">
                        {formatLength(s.duration)}
                      </span>

                      <TrackInfoPopover song={s} />
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
