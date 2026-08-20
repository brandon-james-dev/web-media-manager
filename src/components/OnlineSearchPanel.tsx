import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { IOnlineMetadata } from "@/lib/online-metadata-utils/IOnlineMetadata";
import { MetadataProvider } from "@/lib/online-metadata-utils/MetadataProvider";
import { OnlineMetadataResolver } from "@/lib/online-metadata-utils/OnlineMetadataResolver";
import type { Song } from "@/models";
import type { IPicture } from "@/lib/metadata-utils";
import { Loader2 } from "lucide-react";

export default function OnlineSearchPanel({
  song,
  onSelect,
}: {
  song: Song;
  onSelect: (result: IOnlineMetadata) => void;
}) {
  //#region State
  const [query, setQuery] = useState(song.title + " " + song.artist);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<IOnlineMetadata[] | null>(null);
  const [selected, setSelected] = useState<IOnlineMetadata | null>(null);
  //#endregion

  //#region Helpers
  function coverFront(songResult: IOnlineMetadata): IPicture | undefined {
    return songResult.pictures?.find((p) => p.type == "FrontCover");
  }
  //#endregion

  //#region Interactivity handlers
  async function handleSearch(provider: MetadataProvider) {
    setLoading(true);

    const service = OnlineMetadataResolver.getService(provider);

    const res = await service.lookup(query);

    setResults(res);
    setSelected(null);
    setLoading(false);
  }
  //#endregion

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 bg-primary-foreground border-b sticky z-20 top-0">
        <div className="lg:w-4xl mx-auto flex gap-2 my-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search online…"
          />

          <Button onClick={() => handleSearch(MetadataProvider.iTunes)}>
            iTunes
          </Button>

          <Button onClick={() => handleSearch(MetadataProvider.MusicBrainz)}>
            MusicBrainz
          </Button>
        </div>
      </div>
      <div className="flex-1 pt-2">
        {loading && (
          <div className="text-center space-y-2">
            <Loader2 className="inline-block animate-spin" /> Searching…
          </div>
        )}

        {results && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-3 border rounded-md p-2">
              {results.map((r, idx) => (
                <button
                  key={idx}
                  className={`text-left p-3 border rounded-md hover:bg-accent/30 hover:border-accent/50 ${
                    selected === r ? "bg-accent/10 border-accent/30" : ""
                  }`}
                  onClick={() => setSelected(r)}
                >
                  <div className="font-medium">{r.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {r.artist} — {r.album}
                  </div>
                </button>
              ))}
            </div>

            <div className="border rounded-md p-4">
              {!selected && (
                <div className="text-muted-foreground">Select a result</div>
              )}

              {selected && (
                <div className="sticky top-12 pt-4">
                  <div className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-2">
                    <div className="row-span-3">
                      {coverFront(selected) && (
                        <img
                          src={URL.createObjectURL(
                            new Blob([coverFront(selected)!.data.slice()])
                          )}
                          className="w-32 h-32 object-cover rounded-md border"
                        />
                      )}
                      {!coverFront(selected) && <text>No album photo</text>}
                    </div>

                    <div>
                      <div className="font-semibold">Title</div>
                      <div className="text-muted-foreground">
                        {selected.title}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold">Artist</div>
                      <div className="text-muted-foreground">
                        {selected.artist}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold">Album</div>
                      <div className="text-muted-foreground">
                        {selected.album}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold">Album Artist</div>
                      <div className="text-muted-foreground">
                        {selected.albumArtist ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold">Year</div>
                      <div className="text-muted-foreground">
                        {selected.year ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold">Genre</div>
                      <div className="text-muted-foreground">
                        {selected.genre ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center p-3">
                    <Button onClick={() => onSelect(selected)}>
                      Apply Metadata
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
