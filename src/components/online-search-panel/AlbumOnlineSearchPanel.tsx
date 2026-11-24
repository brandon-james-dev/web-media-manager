import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import type {
  IOnlineAlbumMetadata,
  IOnlineAlbumTrack,
} from "@/lib/metadata-providers/online/IOnlineAlbumMetadata";
import { MetadataProvider } from "@/lib/metadata-providers/online/MetadataProvider";
import { OnlineMetadataResolver } from "@/lib/metadata-providers/online/OnlineMetadataResolver";
import { useTranslation } from "@/i18n";
import type { AlbumOnlineSearchPanelProps } from "./AlbumOnlineSearchPanelProps";
import { OnlineSearchQueryForm } from "./OnlineSearchQueryForm";

/** Group a looked-up track list by disc, keeping the provider's order. */
function groupTracksByDisc(tracks: IOnlineAlbumTrack[]) {
  const groups: Array<{ disc: number; tracks: IOnlineAlbumTrack[] }> = [];

  for (const track of tracks) {
    const disc = track.discNumber ?? 1;
    let group = groups.find((entry) => entry.disc === disc);
    if (!group) {
      group = { disc, tracks: [] };
      groups.push(group);
    }
    group.tracks.push(track);
  }

  return groups.sort((a, b) => a.disc - b.disc);
}

/**
 * Album lookup for the album editor. Same query format as the song lookup,
 * but the result is an album whose track list is fetched on Apply and then
 * written to every track of the album.
 */
export default function AlbumOnlineSearchPanel(
  props: AlbumOnlineSearchPanelProps
) {
  const { album, onSelect } = props;
  const { t } = useTranslation();
  //#region State
  const [titleQuery, setTitleQuery] = useState("");
  const [artistQuery, setArtistQuery] = useState(album.artist);
  const [albumQuery, setAlbumQuery] = useState(album.title);
  const [selectedProvider, setSelectedProvider] = useState<MetadataProvider>(
    MetadataProvider.iTunes
  );
  const [loading, setLoading] = useState(false);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState<IOnlineAlbumMetadata[] | null>(null);
  const [selected, setSelected] = useState<IOnlineAlbumMetadata | null>(null);
  const [selectedTracks, setSelectedTracks] = useState<
    IOnlineAlbumTrack[] | null
  >(null);
  const [applyMetadata, setApplyMetadata] = useState(true);
  const [error, setError] = useState<string | null>(null);
  //#endregion

  //#region Interactivity handlers
  async function handleSearch(provider: MetadataProvider) {
    setLoading(true);
    setError(null);

    const service = OnlineMetadataResolver.getAlbumService(provider);
    // Same provider-specific query shape as the song lookup: MusicBrainz
    // builds a scoped Lucene query from the structured fields, iTunes takes
    // a plain full-text concatenation.
    const searchQuery =
      provider === MetadataProvider.MusicBrainz
        ? [titleQuery, artistQuery, albumQuery].join("|")
        : [titleQuery, artistQuery, albumQuery].filter(Boolean).join(" ");

    try {
      const res = await service.searchAlbums(searchQuery);

      setResults(res);
      setSelected(null);
      setSelectedTracks(null);
    } catch (e) {
      setResults(null);
      setSelected(null);
      setSelectedTracks(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  /**
   * Selecting a result loads its track list straight away, so the disc and
   * track numbers are visible before Apply rather than only after it.
   */
  async function handleSelectResult(result: IOnlineAlbumMetadata) {
    setSelected(result);
    setSelectedTracks(null);
    setError(null);
    setTracksLoading(true);

    try {
      const service = OnlineMetadataResolver.getAlbumService(result.source);
      const full = await service.lookupAlbumTracks(result);
      setSelected(full ?? result);
      setSelectedTracks(full?.tracks ?? []);
    } catch (e) {
      setSelectedTracks([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTracksLoading(false);
    }
  }

  async function handleApply() {
    if (!selected) return;

    setApplying(true);
    setError(null);

    try {
      // The track list was already fetched when the result was selected;
      // only fetch it here if that request failed or never ran.
      let full: IOnlineAlbumMetadata = selectedTracks
        ? { ...selected, tracks: selectedTracks }
        : selected;
      if (!selectedTracks) {
        const service = OnlineMetadataResolver.getAlbumService(selected.source);
        full = (await service.lookupAlbumTracks(selected)) ?? selected;
      }
      onSelect(full, applyMetadata);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  }
  //#endregion

  const trackGroups = groupTracksByDisc(selectedTracks ?? []);

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
        showTitle={false}
      />
      <div className="flex-1 py-2">
        {loading && (
          <div className="text-center space-y-2">
            <Loader2 className="inline-block animate-spin" />{" "}
            {t("search.searching")}
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
              {results.map((result) => (
                <button
                  key={result.id}
                  className={`text-left p-3 border rounded-md hover:bg-accent/30 hover:border-accent/50 ${
                    selected === result ? "bg-accent/10 border-accent/30" : ""
                  }`}
                  onClick={() => handleSelectResult(result)}
                >
                  <div className="font-medium">{result.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {result.artist}
                    {result.year ? ` — ${result.year}` : ""}
                  </div>
                  {result.trackCount ? (
                    <div className="text-xs text-muted-foreground">
                      {t("library.songCount", [result.trackCount])}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="border rounded-md p-4">
              {!selected && (
                <div className="text-muted-foreground">
                  {t("search.selectResult")}
                </div>
              )}

              {selected && (
                <div className="pt-2">
                  <div className="sticky top-0 z-raised flex items-center justify-between gap-3 py-1.5 border-b">
                    <div className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={applyMetadata}
                        onCheckedChange={setApplyMetadata}
                      />
                      <span>{t("metadata.applyMetadataToTracks")}</span>
                    </div>
                    <Button onClick={handleApply} disabled={applying}>
                      {applying && (
                        <Loader2 className="inline-block animate-spin" />
                      )}
                      {t("metadata.apply")}
                    </Button>
                  </div>

                  <div className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-2 pt-2">
                    <div className="row-span-3">
                      {selected.pictures?.find(
                        (picture) => picture.type === "FrontCover"
                      )?.url ? (
                        <img
                          src={
                            selected.pictures.find(
                              (picture) => picture.type === "FrontCover"
                            )!.url
                          }
                          onError={(e) => {
                            // coverartarchive/artwork URLs can 500 transiently —
                            // hide the broken image rather than show a glyph.
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                          className="w-32 h-32 object-cover rounded-md border"
                        />
                      ) : (
                        <text>{t("search.noAlbumPhoto")}</text>
                      )}
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
                        {selected.artist ?? "—"}
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

                  <div className="mt-2 border-t pt-2">
                    <div className="grid grid-cols-[48px_1fr] text-xs font-medium text-muted-foreground pb-1">
                      <div>{t("metadata.track")}</div>
                      <div>{t("metadata.title")}</div>
                    </div>

                    {tracksLoading && (
                      <div className="text-sm text-muted-foreground py-2">
                        <Loader2 className="inline-block animate-spin" />{" "}
                        {t("search.searching")}
                      </div>
                    )}

                    {!tracksLoading && selectedTracks?.length === 0 && (
                      <div className="text-sm text-muted-foreground py-2">
                        {t("metadata.noTracks")}
                      </div>
                    )}

                    {!tracksLoading && trackGroups.length > 0 && (
                      <div className="max-h-72 overflow-y-auto">
                        {trackGroups.map((group) => (
                          <div key={group.disc}>
                            {trackGroups.length > 1 && (
                              <div className="text-xs font-semibold pt-2 pb-1">
                                {t("metadata.disc")} {group.disc}
                              </div>
                            )}
                            <div className="divide-y">
                              {group.tracks.map((track, index) => (
                                <div
                                  key={`${group.disc}-${track.track ?? index}-${index}`}
                                  className="grid grid-cols-[48px_1fr] items-center py-1 text-sm"
                                >
                                  <div className="text-muted-foreground">
                                    {track.track ?? "—"}
                                  </div>
                                  <div className="truncate">{track.title}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
