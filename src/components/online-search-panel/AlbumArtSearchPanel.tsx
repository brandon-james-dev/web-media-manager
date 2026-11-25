import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { MetadataPicture } from "@/core/contracts";
import { MetadataProvider } from "@/lib/metadata-providers/online/MetadataProvider";
import { getMetadataProviderRegistry } from "@/core/ports";
import { useTranslation } from "@/i18n";
import type { AlbumArtSearchPanelProps } from "./AlbumArtSearchPanelProps";
import { OnlineSearchQueryForm } from "./OnlineSearchQueryForm";

/**
 * Album-art picker for the album editor. Same query row as the metadata
 * lookup, but the results are covers only: picking one applies it exactly
 * like choosing an image file from disk.
 */
export default function AlbumArtSearchPanel(props: AlbumArtSearchPanelProps) {
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
  const [pictures, setPictures] = useState<MetadataPicture[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  //#endregion

  //#region Interactivity handlers
  async function handleSearch(provider: MetadataProvider) {
    setLoading(true);
    setError(null);

    const service = getMetadataProviderRegistry().getAlbumService(provider);
    if (!service) {
      setError(`Unknown album metadata provider "${provider}".`);
      setLoading(false);
      return;
    }
    const searchQuery =
      provider === MetadataProvider.MusicBrainz
        ? [titleQuery, artistQuery, albumQuery].join("|")
        : [titleQuery, artistQuery, albumQuery].filter(Boolean).join(" ");

    try {
      setPictures(await service.searchAlbumArt(searchQuery));
    } catch (e) {
      setPictures(null);
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
        showTitle={false}
      />

      <div className="flex-1 py-3">
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

        {!loading && pictures?.length === 0 && (
          <div className="text-sm text-muted-foreground">
            {t("search.noAlbumPhoto")}
          </div>
        )}

        {!loading && pictures && pictures.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {pictures.map((picture, index) => (
              <button
                key={`${picture.url ?? index}-${index}`}
                type="button"
                className="aspect-square overflow-hidden rounded-md border hover:border-accent hover:ring-2 hover:ring-accent/40"
                onClick={() => onSelect(picture)}
              >
                <img
                  src={picture.url}
                  alt={picture.description ?? ""}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
