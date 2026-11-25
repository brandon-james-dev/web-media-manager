import type {
  AlbumMetadataResult,
  AlbumMetadataTrack,
} from "@/core/contracts";

/**
 * Album lookup result.
 *
 * The shapes live in core (`@/core/contracts`), because a provider is a public
 * extension seam. These aliases keep the provider implementations and their
 * callers reading the names they always have.
 */
export type IOnlineAlbumTrack = AlbumMetadataTrack;
export type IOnlineAlbumMetadata = AlbumMetadataResult;
