import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import type { IOnlineMetadata } from "@/lib/metadata-providers/online/IOnlineMetadata";
import { MetadataProvider } from "@/lib/metadata-providers/online/MetadataProvider";
import { getMetadataProviderRegistry } from "@/core/ports";
import type { MetadataPicture } from "@/core/contracts";
import { useTranslation } from "@/i18n";
import type { OnlineSearchPanelProps } from "./OnlineSearchPanelProps";
import { OnlineSearchQueryForm } from "./OnlineSearchQueryForm";

export default function OnlineSearchPanel(props: OnlineSearchPanelProps) {
  const { song, onSelect } = props;
  const { t } = useTranslation();
  //#region State
  const [titleQuery, setTitleQuery] = useState(song.title ?? "");
  const [artistQuery, setArtistQuery] = useState(song.artist ?? "");
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
  function coverFront(songResult: IOnlineMetadata): MetadataPicture | undefined {
    return songResult.pictures?.find((p) => p.type == "FrontCover");
  }
  //#endregion

  //#region Interactivity handlers
  async function handleSearch(provider: MetadataProvider) {
    setLoading(true);
    setError(null);

    const service = getMetadataProviderRegistry().getService(provider);
    if (!service) {
      setError(`Unknown metadata provider "${provider}".`);
      setLoading(false);
      return;
    }
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
      <OnlineSearchQueryForm
        titleQuery={titleQuery}
        artistQuery={artistQuery}
        albumQuery={albumQuery}
        onTitleQueryChange={setTitleQuery}
        onArtistQueryChange={setArtistQuery}
        onAlbumQueryChange={setAlbumQuery}
        provider={selectedProvider}
        onProviderChange={setSelectedProvider}
        onSubmit={() => handleSearch(selectedProvider)}
      />
      <div className="flex-1 py-2">
        {loading && (
          <div className="text-center space-y-2">
            <Loader2 className="inline-block animate-spin" /> {t("search.searching")}
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
                <div className="text-muted-foreground">{t("search.selectResult")}</div>
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
                      {!coverFront(selected) && <text>{t("search.noAlbumPhoto")}</text>}
                    </div>

                    <div>
                      <div className="font-semibold">{t("metadata.title")}</div>
                      <div className="text-muted-foreground">
                        {selected.title}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold">{t("metadata.artist")}</div>
                      <div className="text-muted-foreground">
                        {selected.artist}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold">{t("metadata.album")}</div>
                      <div className="text-muted-foreground">
                        {selected.album}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold">
                        {t("metadata.albumArtist")}
                      </div>
                      <div className="text-muted-foreground">
                        {selected.albumArtist ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold">{t("metadata.year")}</div>
                      <div className="text-muted-foreground">
                        {selected.year ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold">{t("metadata.genre")}</div>
                      <div className="text-muted-foreground">
                        {selected.genre ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center p-3">
                    <Button onClick={() => onSelect(selected)}>
                      {t("metadata.apply")}
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
