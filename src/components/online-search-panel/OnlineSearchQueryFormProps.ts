import type { MetadataProvider } from "@/lib/metadata-providers/online/MetadataProvider";

export interface OnlineSearchQueryFormProps {
  titleQuery: string;
  artistQuery: string;
  albumQuery: string;
  onTitleQueryChange: (value: string) => void;
  onArtistQueryChange: (value: string) => void;
  onAlbumQueryChange: (value: string) => void;
  provider: MetadataProvider;
  onProviderChange: (provider: MetadataProvider) => void;
  onSubmit: () => void;
  /** Album lookups search by album and artist only. */
  showTitle?: boolean;
}
