import type { MetadataProvider } from "./MetadataProvider";

export interface IOnlineMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string;

  coverFront?: Blob | null;
  coverBack?: Blob | null;

  source: MetadataProvider;

  trackId?: string;
}
