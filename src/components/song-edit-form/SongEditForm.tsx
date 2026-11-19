import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThumbnailSize } from "@/lib";
import type { IOnlineMetadata } from "@/lib/metadata-providers/online/IOnlineMetadata";
import type { SongEditDto } from "@/dto";
import { useRef, useState } from "react";
import OnlineSearchPanel from "../online-search-panel/OnlineSearchPanel";
import { Button } from "../ui/button";
import { Eraser, FileMusic, Globe, Pen, Save, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { SongEditFormProps } from "./SongEditFormProps";
import { AlbumArtImage } from "../album-art-image";
import { LyricsSearchDialog } from "../lyrics-search-dialog/LyricsSearchDialog";
import type { ILyricsResult } from "@/lib/lyrics-providers/ILyricsService";
import { useSourceEditable } from "@/lib/hooks/useSourceEditable";
import { useTranslation } from "@/i18n";

export function SongEditForm(props: SongEditFormProps) {
  //#region State
  const { song, formId, onFormSubmit, onNavigatePrev, onNavigateNext, isPrevDisabled, isNextDisabled, onClose } = props;
  const { t } = useTranslation();
  const [updatedFrontCover, setUpdatedFrontCover] = useState<Blob>();
  const [showSearch, setShowSearch] = useState(false);
  const [showLyricsSearch, setShowLyricsSearch] = useState(false);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLFormElement>(null);
  //#endregion

  // Disable the form when the song's source doesn't allow metadata write-back.
  const editable = useSourceEditable([song]);

  //#region Helpers
  const set = (name: string, value: any) => {
    if (!formRef.current) return;
    const form = formRef.current;
    const el = form.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (el) el.value = value ?? "";
    const originalValue = (song as any)[name];
    markDirty(name, el?.value != originalValue);
  };

  /** Current value of a form field, or "" when the field is absent. */
  const getFieldValue = (name: string): string => {
    if (!formRef.current) return "";
    const el = formRef.current.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    return el?.value ?? "";
  };

  function markDirty(name: string, isDirty: boolean) {
    setDirty((prev) => ({ ...prev, [name]: isDirty }));
  }
  //#endregion

  //#region Interactivity handlers

  function handleResetForm() {
    set("title", song.title);
    set("artist", song.artist);
    set("album", song.album);
    set("albumArtist", song.albumArtist);
    set("genre", song.genre);

    // Year
    set("year", song.year ? Number(song.year) : undefined);

    // Track / Disc
    set("track", song.track ? Number(song.track) : undefined);
    set("totalTracks", song.totalTracks ? Number(song.totalTracks) : undefined);
    set("disc", song.discNumber ? Number(song.discNumber) : undefined);
    set("totalDiscs", song.totalDiscs ? Number(song.totalDiscs) : undefined);

    // Credits
    set("composer", song.composer);
    set("bpm", song.bpm ? Number(song.bpm) : undefined);
    set("copyright", song.copyright);
    set("encodedBy", song.encodedBy);

    // Text fields
    set("comment", song.comment);
    set("lyrics", song.lyrics);
    setDirty({});
    setUpdatedFrontCover(undefined);
  }

  async function handleSearchResultConfirm(online: IOnlineMetadata) {
    if (!formRef.current) return;

    // Basic metadata
    set("title", online.title);
    set("artist", online.artist);
    set("album", online.album);
    set("albumArtist", online.albumArtist);
    set("genre", online.genre);

    // Year
    set("year", online.year ? Number(online.year) : undefined);

    // Track / Disc
    set("track", online.track ? Number(online.track) : undefined);
    set(
      "totalTracks",
      online.totalTracks ? Number(online.totalTracks) : undefined
    );
    set("disc", online.discNumber ? Number(online.discNumber) : undefined);
    set(
      "totalDiscs",
      online.totalDiscs ? Number(online.totalDiscs) : undefined
    );

    // Credits
    set("composer", online.composer);
    set("bpm", online.bpm ? Number(online.bpm) : undefined);
    set("copyright", online.copyright);
    set("encodedBy", online.encodedBy);

    // Text fields
    set("comment", online.comment);

    // Lyrics are hand-written or fetched deliberately, so an online result
    // never replaces text that is already there. Checked against the field
    // rather than the stored song so an unsaved edit counts as content too.
    if (getFieldValue("lyrics").trim() === "") {
      set("lyrics", online.lyrics);
    }

    // Album art: search results carry only the thumbnail `url` — download
    // the full-size (1000x1000) image here, at Apply time, not during search.
    const frontCover = online.pictures?.find((p) => p.type === "FrontCover");

    if (frontCover) {
      let coverData: Uint8Array | undefined;
      if (frontCover.data && frontCover.data.length > 0) {
        coverData = frontCover.data;
      } else if (frontCover.url) {
        try {
          // iTunes: swap the thumbnail size for the full 1000x1000 URL.
          let fullUrl = frontCover.url;
          if (fullUrl.includes("100x100")) {
            fullUrl = fullUrl.replace("100x100", "1000x1000");
          }
          const res = await fetch(fullUrl);
          if (res.ok) {
            coverData = new Uint8Array(await res.arrayBuffer());
          }
        } catch {
          // ignore artwork download failures at apply time
        }
      }

      if (coverData && coverData.length > 0) {
        const coverClone = coverData.slice();
        set(
          "frontCover",
          new File(
            [coverClone],
            frontCover.description || "Front Cover" + ".jpeg"
          )
        );
        setUpdatedFrontCover(new Blob([coverClone]));
      }
    }
  }

  function handleLyricsSelect(result: ILyricsResult) {
    // Timed lyrics are a later editor; for now the plain text is what the
    // lyrics field holds.
    set("lyrics", result.plainLyrics ?? result.syncedLyrics ?? "");
  }

  async function handleEditSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable) return;

    const currentTarget = event.currentTarget;
    const formData = new FormData(currentTarget);

    const get = (key: string) => formData.get(key)?.toString().trim() ?? "";
    const num = (key: string, fallback: number | undefined) =>
      formData.get(key) ? Number(formData.get(key)) : fallback;

    const updates: SongEditDto = {
      // Metadata
      title: get("title"),
      artist: get("artist"),
      album: get("album"),
      albumArtist: get("albumArtist"),
      year: num("year", undefined),
      genre: get("genre"),

      // Track Position
      track: num("track", undefined),
      totalTracks: num("totalTracks", undefined),
      discNumber: num("disc", undefined),
      totalDiscs: num("totalDiscs", undefined),

      // Credits
      composer: get("composer"),
      bpm: num("bpm", undefined),
      copyright: get("copyright"),
      encodedBy: get("encodedBy"),

      // Text Fields
      comment: get("comment"),
      lyrics: get("lyrics"),
    };

    if (updatedFrontCover) {
      updates.coverFront = updatedFrontCover;
    }

    onFormSubmit?.(updates);
    currentTarget.reset();
  }
  //#endregion

  return (
    <>
      <div className="mx-auto mt-3 max-w-4xl flex justify-center">
        <div className="flex gap-1 px-6 py-2">
          <Button
            variant={showSearch ? "default" : "secondary"}
            onClick={() => setShowSearch(!showSearch)}
            disabled={!editable}
          >
            <Globe /> {t("metadata.onlineSearch")}
          </Button>
          <Button
            variant="secondary"
            type="reset"
            form={formId || "song-edit-form"}
            onClick={handleResetForm}
            className={
              Object.values(dirty).some((v) => v) ? "border-accent/50" : ""
            }
            disabled={!Object.values(dirty).some((v) => v)}
          >
            <Eraser />
            {t("common.reset")}
          </Button>
          <Button
            type="submit"
            className="bg-accent/50 hover:bg-accent text-white"
            form={formId || "song-edit-form"}
            disabled={!editable || !Object.values(dirty).some((v) => v)}
          >
            <Save /> {t("common.save")}
          </Button>
          <Button
            variant="secondary"
            onClick={onNavigatePrev}
            disabled={isPrevDisabled}
            aria-label={t("metadata.previousSong")}
          >
            <ChevronLeft />
            {t("common.prev")}
          </Button>
          <Button
            variant="secondary"
            onClick={onNavigateNext}
            disabled={isNextDisabled}
            aria-label={t("metadata.nextSong")}
          >
            {t("common.next")}
            <ChevronRight />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
          >
            <X />
            {t("common.close")}
          </Button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto my-4 border rounded-md">
        {showSearch && (
          <OnlineSearchPanel
            song={song}
            onSelect={(result) => {
              handleSearchResultConfirm(result);
              setShowSearch(false);
            }}
          />
        )}
      </div>

      <form
        id={formId || "song-edit-form"}
        ref={formRef}
        className="lg:w-4xl mx-auto pt-4 flex-1 flex flex-col gap-4"
        onSubmit={handleEditSubmit}
      >
        <fieldset disabled={!editable} className="contents">
        <section>
          <div className="grid md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-4">
            <div className="row-span-2">
              <Label
                htmlFor="coverFront"
                className="pb-1 flex items-center gap-2"
              >
                {t("metadata.albumArt")}
                {dirty.coverFront && (
                  <span className="w-2 h-2 bg-accent/50 rounded-full" />
                )}
              </Label>

              <Label htmlFor="coverFront">
                <div
                  className="flex flex-col 
                             items-center justify-center 
                             text-sm 
                             text-muted-foreground bg-background
                            "
                >
                  <div
                    className={`w-32 aspect-square relative border rounded-md group ${
                      editable
                        ? "hover:border-accent cursor-pointer"
                        : "cursor-not-allowed opacity-60"
                    }`}
                  >
                    <Pen
                      size={24}
                      className="
                        absolute top-1 right-1 p-1 rounded-md
                        dark:bg-accent text-white
                        opacity-0
                        transition-opacity
                        group-hover:opacity-100
                        data-[disabled=true]:opacity-0 data-[disabled=true]:group-hover:opacity-0
                      "
                      data-disabled={!editable}
                    />
                    {updatedFrontCover ? (
                      <img
                        src={URL.createObjectURL(updatedFrontCover)}
                        alt={song.album}
                        className="object-cover rounded border border-accent/50"
                      />
                    ) : (
                      <AlbumArtImage
                        songId={song.id}
                        thumbSize={ThumbnailSize.thumb128}
                        className="object-cover rounded"
                        fallback={
                          <>
                            <div>{t("library.noCoverArt")}</div>
                            <div className="text-muted-foreground">
                              {t("common.clickToSelect")}
                            </div>
                          </>
                        }
                      />
                    )}
                    {!editable && (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-md bg-gray-400/40"
                      />
                    )}
                  </div>
                </div>
              </Label>

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

                    // Mark dirty
                    markDirty("coverFront", true);
                  } else {
                    // No file selected → revert dirty state
                    markDirty("coverFront", false);
                  }
                }}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="pb-1" htmlFor="title">
                {t("metadata.title")}
              </Label>
              <Input
                name="title"
                defaultValue={song.title}
                autoComplete="off"
                onChange={(evt) =>
                  markDirty(
                    "title",
                    evt.currentTarget.value !== (song.title ?? "")
                  )
                }
                className={
                  dirty.title
                    ? "dark:active:border-accent/50 dark:border-accent/50"
                    : ""
                }
              />
            </div>

            <div>
              <Label className="pb-1">{t("metadata.artist")}</Label>
              <Input
                name="artist"
                defaultValue={song.artist}
                autoComplete="off"
                onChange={(evt) =>
                  markDirty(
                    "artist",
                    evt.currentTarget.value !== (song.artist ?? "")
                  )
                }
                className={
                  dirty.artist
                    ? "dark:active:border-accent/50 dark:border-accent/50"
                    : ""
                }
              />
            </div>

            <div>
              <Label className="pb-1">{t("metadata.album")}</Label>
              <Input
                name="album"
                defaultValue={song.album}
                autoComplete="off"
                onChange={(evt) =>
                  markDirty(
                    "album",
                    evt.currentTarget.value !== (song.album ?? "")
                  )
                }
                className={dirty.album ? "dark:border-accent/50" : ""}
              />
            </div>

            <div>
              <Label className="pb-1">{t("metadata.albumArtist")}</Label>
              <Input
                name="albumArtist"
                defaultValue={song.albumArtist ?? ""}
                autoComplete="off"
                onChange={(evt) =>
                  markDirty(
                    "albumArtist",
                    evt.currentTarget.value !== (song.albumArtist ?? "")
                  )
                }
                className={dirty.albumArtist ? "dark:border-accent/50" : ""}
              />
            </div>

            <div>
              <Label className="pb-1">{t("metadata.year")}</Label>
              <Input
                name="year"
                defaultValue={song.year}
                autoComplete="off"
                onChange={(evt) =>
                  markDirty(
                    "year",
                    Number(evt.currentTarget.value) !== song.year
                  )
                }
                className={dirty.year ? "dark:border-accent/50" : ""}
              />
            </div>

            <div>
              <Label className="pb-1">{t("metadata.genre")}</Label>
              <Input
                name="genre"
                defaultValue={song.genre ?? ""}
                autoComplete="off"
                onChange={(evt) =>
                  markDirty(
                    "genre",
                    evt.currentTarget.value !== (song.genre ?? "")
                  )
                }
                className={dirty.genre ? "dark:border-accent/50" : ""}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">{t("metadata.trackPosition")}</h2>
          <div className="grid xl:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-4">
            <div>
              <div className="grid grid-cols-3">
                <div>
                  <Label className="pb-1">{t("metadata.track")}</Label>
                  <Input
                    name="track"
                    defaultValue={song.track}
                    autoComplete="off"
                    onChange={(evt) =>
                      markDirty(
                        "track",
                        evt.currentTarget.value !== (song.track ?? "")
                      )
                    }
                    className={dirty.track ? "dark:border-accent/50" : ""}
                  />
                </div>
                <div className="text-muted-foreground flex justify-center align-middle">
                  <Label className="pt-4 inline-flex">{t("common.of")}</Label>
                </div>
                <div>
                  <Label className="pb-1">{t("metadata.tracks")}</Label>
                  <Input
                    name="totalTracks"
                    defaultValue={song.totalTracks}
                    autoComplete="off"
                    onChange={(evt) =>
                      markDirty(
                        "totalTracks",
                        evt.currentTarget.value !== (song.totalTracks ?? "")
                      )
                    }
                    className={dirty.totalTracks ? "dark:border-accent/50" : ""}
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="grid grid-cols-3">
                <div>
                  <Label className="pb-1">{t("metadata.disc")}</Label>
                  <Input
                    name="disc"
                    defaultValue={song.discNumber}
                    autoComplete="off"
                    onChange={(evt) =>
                      markDirty(
                        "disc",
                        evt.currentTarget.value !== (song.discNumber ?? "")
                      )
                    }
                    className={dirty.disc ? "dark:border-accent/50" : ""}
                  />
                </div>
                <div className="text-muted-foreground flex justify-center align-middle">
                  <Label className="pt-4 inline-flex">{t("common.of")}</Label>
                </div>
                <div>
                  <Label className="pb-1">{t("metadata.discs")}</Label>
                  <Input
                    name="totalDiscs"
                    defaultValue={song.totalDiscs}
                    autoComplete="off"
                    onChange={(evt) =>
                      markDirty(
                        "totalDiscs",
                        evt.currentTarget.value !== (song.totalDiscs ?? "")
                      )
                    }
                    className={dirty.totalDiscs ? "dark:border-accent/50" : ""}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">{t("metadata.credits")}</h2>
          <div className="grid xl:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-4">
            <div>
              <Label className="pb-1">{t("metadata.composer")}</Label>
              <Input
                name="composer"
                defaultValue={song.composer ?? ""}
                autoComplete="off"
                onChange={(evt) =>
                  markDirty(
                    "composer",
                    evt.currentTarget.value !== (song.composer ?? "")
                  )
                }
                className={dirty.composer ? "dark:border-accent/50" : ""}
              />
            </div>
            <div>
              <Label className="pb-1">{t("metadata.bpm")}</Label>
              <Input
                name="bpm"
                defaultValue={song.bpm ?? ""}
                autoComplete="off"
                onChange={(evt) =>
                  markDirty(
                    "album",
                    evt.currentTarget.value !== (song.bpm ?? "")
                  )
                }
                className={dirty.bpm ? "dark:border-accent/50" : ""}
              />
            </div>
            <div>
              <Label className="pb-1">{t("metadata.copyright")}</Label>
              <Input
                name="copyright"
                defaultValue={song.copyright ?? ""}
                autoComplete="off"
                onChange={(evt) =>
                  markDirty(
                    "copyright",
                    evt.currentTarget.value !== (song.copyright ?? "")
                  )
                }
                className={dirty.copyright ? "dark:border-accent/50" : ""}
              />
            </div>
            <div>
              <Label className="pb-1">{t("metadata.encoder")}</Label>
              <Input
                name="encodedBy"
                defaultValue={song.encodedBy ?? ""}
                autoComplete="off"
                onChange={(evt) =>
                  markDirty(
                    "encodedBy",
                    evt.currentTarget.value !== (song.encodedBy ?? "")
                  )
                }
                className={dirty.encodedBy ? "dark:border-accent/50" : ""}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">{t("metadata.textFields")}</h2>
          <div className="grid xl:grid-cols-2 gap-4">
            <div>
              <div className="flex min-h-7 items-center justify-between pb-1">
                <Label>{t("metadata.lyrics")}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowLyricsSearch(true)}
                >
                  <FileMusic /> {t("metadata.fetchLyrics")}
                </Button>
              </div>
              <Textarea
                name="lyrics"
                defaultValue={song.lyrics ?? ""}
                autoComplete="off"
                onChange={(evt) =>
                  markDirty(
                    "lyrics",
                    evt.currentTarget.value !== (song.lyrics ?? "")
                  )
                }
                className={dirty.lyrics ? "dark:border-accent/50" : ""}
              />
            </div>
            <div>
              <div className="flex min-h-7 items-center justify-between pb-1">
                <Label>{t("metadata.comment")}</Label>
              </div>
              <Textarea
                name="comment"
                defaultValue={song.comment ?? ""}
                autoComplete="off"
                onChange={(evt) =>
                  markDirty(
                    "comment",
                    evt.currentTarget.value !== (song.comment ?? "")
                  )
                }
                className={dirty.comment ? "dark:border-accent/50" : ""}
              />
            </div>
          </div>
        </section>
        </fieldset>
      </form>

      <LyricsSearchDialog
        song={song}
        open={showLyricsSearch}
        onOpenChange={setShowLyricsSearch}
        onSelect={handleLyricsSelect}
      />
    </>
  );
}
