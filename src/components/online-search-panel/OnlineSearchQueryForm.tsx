import { ChevronDown, Globe } from "lucide-react";
import { Itunes, Musicbrainz } from "@thesvg/react";
import { Input } from "../ui/input";
import { PluginThumbnail } from "../plugin-manager";
import { MetadataProvider } from "@/lib/metadata-providers/online/MetadataProvider";
import { SplitButton } from "../split-button/SplitButton";
import { useTranslation } from "@/i18n";
import type { MetadataProviderDescriptor } from "@/core/contracts";
import type { OnlineSearchQueryFormProps } from "./OnlineSearchQueryFormProps";

/** Brand marks for the built-ins; a plugin provider shows its own thumbnail. */
const PROVIDER_ICON: Record<string, React.ReactNode> = {
  [MetadataProvider.iTunes]: <Itunes variant="mono" className="h-4 w-4" />,
  [MetadataProvider.MusicBrainz]: (
    <Musicbrainz variant="mono" className="h-4 w-4" />
  ),
};

function providerIcon(entry: MetadataProviderDescriptor): React.ReactNode {
  const brand = PROVIDER_ICON[entry.id];
  if (brand) {
    return brand;
  }
  if (entry.pluginId) {
    return <PluginThumbnail pluginId={entry.pluginId} className="size-4" />;
  }
  return <Globe className="h-4 w-4" />;
}

/** The title/artist/album query row shared by the song and album lookups. */
export function OnlineSearchQueryForm(props: OnlineSearchQueryFormProps) {
  const {
    titleQuery,
    artistQuery,
    albumQuery,
    onTitleQueryChange,
    onArtistQueryChange,
    onAlbumQueryChange,
    provider,
    onProviderChange,
    providers,
    onSubmit,
    showTitle = true,
  } = props;
  const { t } = useTranslation();

  return (
    <div className="shrink-0 bg-primary-foreground border-b sticky z-raised top-0">
      <form
        className="lg:w-4xl mx-auto flex gap-3 px-4 my-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {showTitle && (
          <Input
            value={titleQuery}
            autoComplete="off"
            onChange={(e) => onTitleQueryChange(e.target.value)}
            placeholder={t("search.titlePlaceholder")}
            className="flex-1 min-w-0"
          />
        )}
        <Input
          value={artistQuery}
          autoComplete="off"
          onChange={(e) => onArtistQueryChange(e.target.value)}
          placeholder={t("search.artistPlaceholder")}
          className="flex-1 min-w-0"
        />
        <Input
          value={albumQuery}
          autoComplete="off"
          onChange={(e) => onAlbumQueryChange(e.target.value)}
          placeholder={t("search.albumPlaceholder")}
          className="flex-1 min-w-0"
        />
        <SplitButton
          label={t("search.label")}
          dropdownSide="left"
          onPrimaryClick={onSubmit}
          buttonVariant="secondary"
          buttonType="button"
          menuItems={providers.map((entry) => ({
            label: (
              <div className="flex items-center gap-2">
                {providerIcon(entry)}
                {entry.name}
              </div>
            ),
            onClick: () => onProviderChange(entry.id),
          }))}
          dropdownTriggerContent={
            <>
              {providerIcon(
                providers.find((entry) => entry.id === provider) ?? {
                  id: provider,
                  name: provider,
                  origin: "builtin",
                }
              )}
              <ChevronDown />
            </>
          }
        />
      </form>
    </div>
  );
}
