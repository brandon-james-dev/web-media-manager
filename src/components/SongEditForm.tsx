import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThumbnailSize } from "@/lib";
import { ArtworkType } from "@/lib/metadata-utils";
import type { IOnlineMetadata } from "@/lib/online-metadata-utils/IOnlineMetadata";
import type { Song } from "@/models";
import { useRef, useState } from "react";
import OnlineSearchPanel from "./OnlineSearchPanel";
import { Button } from "./ui/button";
import { Eraser, Globe, Pen, Save } from "lucide-react";
import { useArtwork } from "@/hooks";

export function SongEditForm({
  song,
  onFormSubmit,
  formId,
}: {
  song: Song;
  onFormSubmit: (updates: Partial<Song>) => void;
  selectedMetadata?: IOnlineMetadata | null;
  formId?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [frontCover] = useArtwork(
    song.id,
    ArtworkType.FrontCover,
    ThumbnailSize.thumb256
  );
  const [updatedFrontCover, setUpdatedFrontCover] = useState<Blob>();
  const [showSearch, setShowSearch] = useState(false);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

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

  function getFrontCover(): string | undefined {
    if (!(frontCover || updatedFrontCover)) {
      return undefined;
    }

    const frontCoverSet =
      updatedFrontCover || new Blob([frontCover.data.slice()]);
    if (!frontCoverSet) {
      return undefined;
    }
    return URL.createObjectURL(frontCoverSet);
  }

  function onResetForm() {
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
    set("disc", song.disc ? Number(song.disc) : undefined);
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

  function markDirty(name: string, isDirty: boolean) {
    setDirty((prev) => ({ ...prev, [name]: isDirty }));
  }

  function onSearchResultConfirm(online: IOnlineMetadata) {
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
    set("disc", online.disc ? Number(online.disc) : undefined);
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
    set("lyrics", online.lyrics);

    // Album art
    const frontCover = online.pictures?.find((p) => p.type === "FrontCover");

    if (frontCover && frontCover.data.length > 0) {
      const coverData = [frontCover.data.slice()];
      set(
        "frontCover",
        new File(coverData, frontCover.description || "Front Cover" + ".jpeg")
      );
      setUpdatedFrontCover(new Blob(coverData));
    }
  }

  async function handleEditSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const currentTarget = event.currentTarget;
    const formData = new FormData(currentTarget);

    const get = (key: string) => formData.get(key)?.toString().trim() ?? "";
    const num = (key: string, fallback: number | undefined) =>
      formData.get(key) ? Number(formData.get(key)) : fallback;

    const updates: Partial<Song> = {
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
      disc: num("disc", undefined),
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

  return (
    <>
      <div className="flex justify-center gap-3 px-6 py-2">
        <Button
          variant={showSearch ? "default" : "secondary"}
          onClick={() => setShowSearch(!showSearch)}
        >
          <Globe /> Online Search
        </Button>
        <Button
          variant="secondary"
          type="reset"
          form="song-edit-form"
          onClick={onResetForm}
          className={
            Object.values(dirty).some((v) => v) ? "dark:border-indigo-600" : ""
          }
        >
          <Eraser />
          Reset
        </Button>
        <Button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
          form="song-edit-form"
        >
          <Save /> Save Changes
        </Button>
      </div>
      <div className="max-h-80 overflow-y-auto my-4 border rounded-md">
        {showSearch && (
          <OnlineSearchPanel
            song={song}
            onSelect={(result) => {
              onSearchResultConfirm(result);
              setShowSearch(false);
            }}
          />
        )}
      </div>

      <form
        id={formId}
        ref={formRef}
        className="lg:w-4xl mx-auto flex-1 flex flex-col gap-4"
        onSubmit={handleEditSubmit}
      >
        <section>
          <div className="grid xl:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-4">
            <div className="hidden md:block row-span-2">
              <Label
                htmlFor="coverFront"
                className="pb-1 flex items-center gap-2"
              >
                Album Art
                {dirty.coverFront && (
                  <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                )}
              </Label>

              {getFrontCover() ? (
                <Label htmlFor="coverFront" className="cursor-pointer">
                  <div className="relative border rounded-md hover:border-indigo-500 group">
                    <img
                      src={getFrontCover()}
                      alt={song.title}
                      className={
                        dirty.coverFront
                          ? "w-32 h-32 object-cover rounded-md border border-indigo-500"
                          : "w-32 h-32 object-cover rounded-md border"
                      }
                    />

                    <Pen
                      size={24}
                      className="
                        absolute top-0 right-0 p-1.5 rounded-md
                        dark:bg-indigo-500
                        opacity-0
                        group-hover:opacity-100
                        transition-opacity
                      "
                    />
                  </div>
                </Label>
              ) : (
                <Label htmlFor="coverFront" className="cursor-pointer p-2">
                  No cover art. Click to select.
                </Label>
              )}

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
                Title
              </Label>
              <Input
                name="title"
                defaultValue={song.title}
                onChange={(evt) =>
                  markDirty(
                    "title",
                    evt.currentTarget.value !== (song.title ?? "")
                  )
                }
                className={
                  dirty.title
                    ? "dark:active:border-indigo-500 dark:border-indigo-500"
                    : ""
                }
              />
            </div>

            <div>
              <Label className="pb-1">Artist</Label>
              <Input
                name="artist"
                defaultValue={song.artist}
                onChange={(evt) =>
                  markDirty(
                    "artist",
                    evt.currentTarget.value !== (song.artist ?? "")
                  )
                }
              />
            </div>

            <div>
              <Label className="pb-1">Album</Label>
              <Input
                name="album"
                defaultValue={song.album}
                onChange={(evt) =>
                  markDirty(
                    "album",
                    evt.currentTarget.value !== (song.album ?? "")
                  )
                }
                className={dirty.album ? "dark:border-indigo-500" : ""}
              />
            </div>

            <div>
              <Label className="pb-1">Album Artist</Label>
              <Input
                name="albumArtist"
                defaultValue={song.albumArtist ?? ""}
                onChange={(evt) =>
                  markDirty(
                    "albumArtist",
                    evt.currentTarget.value !== (song.albumArtist ?? "")
                  )
                }
                className={dirty.albumArtist ? "dark:border-indigo-500" : ""}
              />
            </div>

            <div>
              <Label className="pb-1">Year</Label>
              <Input
                name="year"
                defaultValue={song.year}
                onChange={(evt) =>
                  markDirty(
                    "year",
                    Number(evt.currentTarget.value) !== song.year
                  )
                }
                className={dirty.year ? "dark:border-indigo-500" : ""}
              />
            </div>

            <div>
              <Label className="pb-1">Genre</Label>
              <Input
                name="genre"
                defaultValue={song.genre ?? ""}
                onChange={(evt) =>
                  markDirty(
                    "genre",
                    evt.currentTarget.value !== (song.genre ?? "")
                  )
                }
                className={dirty.genre ? "dark:border-indigo-500" : ""}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Track Position</h2>
          <div className="grid xl:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-4">
            <div>
              <div className="grid grid-cols-3">
                <div>
                  <Label className="pb-1">Track</Label>
                  <Input
                    name="track"
                    defaultValue={song.track}
                    onChange={(evt) =>
                      markDirty(
                        "track",
                        evt.currentTarget.value !== (song.track ?? "")
                      )
                    }
                    className={dirty.track ? "dark:border-indigo-500" : ""}
                  />
                </div>
                <div className="text-muted-foreground flex justify-center align-middle">
                  <Label className="pt-4 inline-flex">of</Label>
                </div>
                <div>
                  <Label className="pb-1">Tracks</Label>
                  <Input
                    name="totalTracks"
                    defaultValue={song.totalTracks}
                    onChange={(evt) =>
                      markDirty(
                        "totalTracks",
                        evt.currentTarget.value !== (song.totalTracks ?? "")
                      )
                    }
                    className={
                      dirty.totalTracks ? "dark:border-indigo-500" : ""
                    }
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="grid grid-cols-3">
                <div>
                  <Label className="pb-1">Disc</Label>
                  <Input
                    name="disc"
                    defaultValue={song.disc}
                    onChange={(evt) =>
                      markDirty(
                        "disc",
                        evt.currentTarget.value !== (song.disc ?? "")
                      )
                    }
                    className={dirty.disc ? "dark:border-indigo-500" : ""}
                  />
                </div>
                <div className="text-muted-foreground flex justify-center align-middle">
                  <Label className="pt-4 inline-flex">of</Label>
                </div>
                <div>
                  <Label className="pb-1">Discs</Label>
                  <Input
                    name="totalDiscs"
                    defaultValue={song.totalDiscs}
                    onChange={(evt) =>
                      markDirty(
                        "totalDiscs",
                        evt.currentTarget.value !== (song.totalDiscs ?? "")
                      )
                    }
                    className={dirty.totalDiscs ? "dark:border-indigo-500" : ""}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Credits</h2>
          <div className="grid xl:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-4">
            <div>
              <Label className="pb-1">Composer</Label>
              <Input
                name="composer"
                defaultValue={song.composer ?? ""}
                onChange={(evt) =>
                  markDirty(
                    "composer",
                    evt.currentTarget.value !== (song.composer ?? "")
                  )
                }
                className={dirty.composer ? "dark:border-indigo-500" : ""}
              />
            </div>
            <div>
              <Label className="pb-1">BPM</Label>
              <Input
                name="bpm"
                defaultValue={song.bpm ?? ""}
                onChange={(evt) =>
                  markDirty(
                    "album",
                    evt.currentTarget.value !== (song.bpm ?? "")
                  )
                }
                className={dirty.bpm ? "dark:border-indigo-500" : ""}
              />
            </div>
            <div>
              <Label className="pb-1">Copyright</Label>
              <Input
                name="copyright"
                defaultValue={song.copyright ?? ""}
                onChange={(evt) =>
                  markDirty(
                    "copyright",
                    evt.currentTarget.value !== (song.copyright ?? "")
                  )
                }
                className={dirty.copyright ? "dark:border-indigo-500" : ""}
              />
            </div>
            <div>
              <Label className="pb-1">Encoder</Label>
              <Input
                name="encodedBy"
                defaultValue={song.encodedBy ?? ""}
                onChange={(evt) =>
                  markDirty(
                    "encodedBy",
                    evt.currentTarget.value !== (song.encodedBy ?? "")
                  )
                }
                className={dirty.encodedBy ? "dark:border-indigo-500" : ""}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Text Fields</h2>
          <div className="grid xl:grid-cols-2 gap-4">
            <div>
              <Label className="pb-1">Comment</Label>
              <Textarea
                name="comment"
                defaultValue={song.comment ?? ""}
                onChange={(evt) =>
                  markDirty(
                    "comment",
                    evt.currentTarget.value !== (song.comment ?? "")
                  )
                }
                className={dirty.comment ? "dark:border-indigo-500" : ""}
              />
            </div>
            <div>
              <Label className="pb-1">Lyrics</Label>
              <Textarea
                name="lyrics"
                defaultValue={song.lyrics ?? ""}
                onChange={(evt) =>
                  markDirty(
                    "lyrics",
                    evt.currentTarget.value !== (song.lyrics ?? "")
                  )
                }
                className={dirty.lyrics ? "dark:border-indigo-500" : ""}
              />
            </div>
          </div>
        </section>
      </form>
    </>
  );
}
