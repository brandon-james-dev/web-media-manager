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
import { Eraser, Globe, Save } from "lucide-react";
import { useArtwork } from "@/hooks";

export function SongEditForm({
  song,
  onFormSubmit,
  id,
}: {
  song: Song;
  onFormSubmit: (updates: Partial<Song>) => void;
  selectedMetadata?: IOnlineMetadata | null;
  id?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [frontCover] = useArtwork(
    song.id,
    ArtworkType.FrontCover,
    ThumbnailSize.thumb256
  );
  const [updatedFrontCover, setUpdatedFrontCover] = useState<Blob>();
  const [showSearch, setShowSearch] = useState(false);

  function getFrontCover(): string | undefined {
    if (!frontCover) {
      return undefined;
    }
    const frontCoverSet =
      updatedFrontCover ?? new Blob([frontCover.data.slice()]);
    if (!frontCoverSet) {
      return undefined;
    }
    return URL.createObjectURL(frontCoverSet);
  }

  function onResetForm() {
    setUpdatedFrontCover(undefined);
  }

  function onSearchResultConfirm(online: IOnlineMetadata) {
    if (!formRef.current) return;

    const form = formRef.current;

    const set = (name: string, value: any) => {
      const el = form.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      if (el) el.value = value ?? "";
    };

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
    set("disc", online.disc ? Number(online.disc) : undefined);

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

    if (frontCover) {
      setUpdatedFrontCover(new Blob([frontCover.data.slice()]));
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
      disc: num("disc", undefined),

      // Credits
      composer: get("composer"),
      bpm: num("bpm", undefined),
      copyright: get("copyright"),
      encodedBy: get("encodedBy"),

      // Text Fields
      comment: get("comment"),
      lyrics: get("lyrics"),
    };

    // Album art file inputs
    const frontFile = formData.get("coverFront") as File | null;
    const backFile = formData.get("coverBack") as File | null;

    if (frontFile && frontFile.size > 0) {
      updates.coverFront = frontFile;
    }

    if (backFile && backFile.size > 0) {
      updates.coverBack = backFile;
    }

    currentTarget.reset();
    onFormSubmit?.(updates);
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
        >
          <Eraser />
          Reset
        </Button>
        <Button type="submit" form="song-edit-form">
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
        id={id}
        ref={formRef}
        className="lg:w-4xl mx-auto flex-1 flex flex-col gap-10"
        onSubmit={handleEditSubmit}
      >
        <section>
          <div className="grid xl:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-4">
            <div className="hidden md:block row-span-2">
              <Label className="pb-1">Album Art</Label>
              {getFrontCover() ? (
                <img
                  src={getFrontCover()}
                  alt={song.title}
                  className="w-32 h-32 object-cover rounded-md border"
                />
              ) : (
                <div>No cover art</div>
              )}
            </div>

            <div>
              <Label className="pb-1" htmlFor="title">
                Title
              </Label>
              <Input id="title" name="title" defaultValue={song.title} />
            </div>

            <div>
              <Label className="pb-1">Artist</Label>
              <Input name="artist" defaultValue={song.artist} />
            </div>

            <div>
              <Label className="pb-1">Album</Label>
              <Input name="album" defaultValue={song.album} />
            </div>

            <div>
              <Label className="pb-1">Album Artist</Label>
              <Input name="albumArtist" defaultValue={song.albumArtist ?? ""} />
            </div>

            <div>
              <Label className="pb-1">Year</Label>
              <Input name="year" defaultValue={song.year} />
            </div>

            <div>
              <Label className="pb-1">Genre</Label>
              <Input name="genre" defaultValue={song.genre ?? ""} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Track Position</h2>
          <div className="grid xl:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-4">
            <div>
              <Label className="pb-1">Track Number</Label>
              <Input name="track" defaultValue={song.track} />
            </div>
            <div>
              <Label className="pb-1">Disc Number</Label>
              <Input name="disc" defaultValue={song.disc ?? ""} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Credits</h2>
          <div className="grid xl:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-4">
            <div>
              <Label className="pb-1">Composer</Label>
              <Input name="composer" defaultValue={song.composer ?? ""} />
            </div>
            <div>
              <Label className="pb-1">BPM</Label>
              <Input name="bpm" defaultValue={song.bpm ?? ""} />
            </div>
            <div>
              <Label className="pb-1">Copyright</Label>
              <Input name="copyright" defaultValue={song.copyright ?? ""} />
            </div>
            <div>
              <Label className="pb-1">Encoder</Label>
              <Input name="encodedBy" defaultValue={song.encodedBy ?? ""} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Text Fields</h2>
          <div className="grid xl:grid-cols-2 gap-4">
            <div>
              <Label className="pb-1">Comment</Label>
              <Textarea name="comment" defaultValue={song.comment ?? ""} />
            </div>
            <div>
              <Label className="pb-1">Lyrics</Label>
              <Textarea name="lyrics" defaultValue={song.lyrics ?? ""} />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Save Changes
          </button>
        </div>
      </form>
    </>
  );
}
