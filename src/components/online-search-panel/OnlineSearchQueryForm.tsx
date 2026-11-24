import { ChevronDown } from "lucide-react";
import { Itunes, Musicbrainz } from "@thesvg/react";
import { Input } from "../ui/input";
import { MetadataProvider } from "@/lib/metadata-providers/online/MetadataProvider";
import { SplitButton } from "../split-button/SplitButton";
import { useTranslation } from "@/i18n";
import type { OnlineSearchQueryFormProps } from "./OnlineSearchQueryFormProps";

const PROVIDER_ICON: Record<MetadataProvider, React.ReactNode> = {
  [MetadataProvider.iTunes]: <Itunes variant="mono" className="h-4 w-4" />,
  [MetadataProvider.MusicBrainz]: <Musicbrainz variant="mono" className="h-4 w-4" />,
};
const PROVIDER_NAME: Record<MetadataProvider, string> = {
  [MetadataProvider.iTunes]: "iTunes",
  [MetadataProvider.MusicBrainz]: "MusicBrainz",
};

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
            onClick: () => onProviderChange(provider),
          }))}
          dropdownTriggerContent={
            <>
              {PROVIDER_ICON[provider]}
              <ChevronDown />
            </>
          }
        />
      </form>
    </div>
  );
}
