import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Itunes, Musicbrainz } from "@thesvg/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type { IOnlineMetadata } from "@/lib/metadata-providers/online/IOnlineMetadata";
import { MetadataProvider } from "@/lib/metadata-providers/online/MetadataProvider";
import { OnlineMetadataResolver } from "@/lib/metadata-providers/online/OnlineMetadataResolver";
import type { IPicture } from "@/lib/contracts";
import { SplitButton } from "../split-button/SplitButton";
import type { OnlineSearchPanelProps } from "./OnlineSearchPanelProps";

const PROVIDER_ICON: Record<MetadataProvider, React.ReactNode> = {
  [MetadataProvider.iTunes]: <Itunes variant="mono" className="h-4 w-4" />,
  [MetadataProvider.MusicBrainz]: <Musicbrainz variant="mono" className="h-4 w-4" />,
};
const PROVIDER_NAME: Record<MetadataProvider, string> = {
  [MetadataProvider.iTunes]: "iTunes",
  [MetadataProvider.MusicBrainz]: "MusicBrainz",
};

export default function OnlineSearchPanel(props: OnlineSearchPanelProps) {
  const { song, onSelect } = props;
  //#region State
  const [titleQuery, setTitleQuery] = useState(song.title);
  const [artistQuery, setArtistQuery] = useState(song.artist);
  const [albumQuery, setAlbumQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<MetadataProvider>(
    MetadataProvider.iTunes
  );
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<IOnlineMetadata[] | null>(null);
  const [selected, setSelected] = useState<IOnlineMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  //#endregion

  //#region Helpers
  function coverFront(songResult: IOnlineMetadata): IPicture | undefined {
    return songResult.pictures?.find((p) => p.type == "FrontCover");
  }
  //#endregion

  //#region Interactivity handlers
  async function handleSearch(provider: MetadataProvider) {
    setLoading(true);
    setError(null);

    const service = OnlineMetadataResolver.getService(provider);
    // Build the provider-specific query. iTunes is fuzzy full-text — a plain
    // concatenation works best. MusicBrainz builds a scoped Lucene query from
    // the structured fields in the service itself.
    const searchQuery =
      provider === MetadataProvider.MusicBrainz
        ? [titleQuery, artistQuery, albumQuery].join("|")   // structured, split by |
        : [titleQuery, artistQuery, albumQuery].filter(Boolean).join(" ");

    try {
      const res = await service.lookup(searchQuery);

      setResults(res);
      setSelected(null);
    } catch (e) {
      setResults(null);
      setSelected(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }
  //#endregion

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 bg-primary-foreground border-b sticky z-20 top-0">
        <form
          className="lg:w-4xl mx-auto flex gap-2 my-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(selectedProvider);
          }}
        >
          <Input
            value={titleQuery}
            autoComplete="off"
            onChange={(e) => setTitleQuery(e.target.value)}
            placeholder="Title..."
            className="flex-1 min-w-0"
          />
          <Input
            value={artistQuery}
            autoComplete="off"
            onChange={(e) => setArtistQuery(e.target.value)}
            placeholder="Artist..."
            className="flex-1 min-w-0"
          />
          <Input
            value={albumQuery}
            autoComplete="off"
            onChange={(e) => setAlbumQuery(e.target.value)}
            placeholder="Album..."
            className="flex-1 min-w-0"
          />
          <SplitButton
            label="Search"
            dropdownSide="left"
            onPrimaryClick={async () => await handleSearch(selectedProvider)}
            buttonVariant="secondary"
            buttonType="submit"
            menuItems={(
              Object.values(MetadataProvider) as MetadataProvider[]
            ).map((provider) => ({
              label: (
                <div className="flex items-center gap-2">
                  {PROVIDER_ICON[provider]}
                  {PROVIDER_NAME[provider]}
                </div>
              ),
              onClick: () => setSelectedProvider(provider)
            }))}
            dropdownTriggerContent={<>{PROVIDER_ICON[selectedProvider]}<ChevronDown /></>}
          />
        </form>
      </div>
      <div className="flex-1 py-2">
        {loading && (
          <div className="text-center space-y-2">
            <Loader2 className="inline-block animate-spin" /> Searching…
          </div>
        )}

        {error && (
          <div
            className="mx-auto max-w-xl p-3 border border-destructive/40 rounded-md bg-destructive/10 text-destructive text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {results && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-3 border rounded-md p-2">
              {results.map((r, idx) => (
                <button
                  key={idx}
                  className={`text-left p-3 border rounded-md hover:bg-accent/30 hover:border-accent/50 ${selected === r ? "bg-accent/10 border-accent/30" : ""
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
                          src={
                            coverFront(selected)?.url ??
                            (coverFront(selected)?.data
                              ? URL.createObjectURL(
                                new Blob([
                                  coverFront(selected)!.data!.slice(),
                                ])
                              )
                              : undefined)
                          }
                          onError={(e) => {
                            // coverartarchive/artwork URLs can 500 transiently —
                            // hide the broken image rather than show a glyph.
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
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
