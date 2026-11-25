import type { MetadataProviderDescriptor } from "@/core/contracts";

export interface OnlineSearchQueryFormProps {
  titleQuery: string;
  artistQuery: string;
  albumQuery: string;
  onTitleQueryChange: (value: string) => void;
  onArtistQueryChange: (value: string) => void;
  onAlbumQueryChange: (value: string) => void;
  provider: string;
  onProviderChange: (provider: string) => void;
  /** Providers this lookup can call, built-in and plugin alike. */
  providers: readonly MetadataProviderDescriptor[];
  onSubmit: () => void;
  /** Album lookups search by album and artist only. */
  showTitle?: boolean;
}
