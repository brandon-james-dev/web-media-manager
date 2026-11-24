import type { IPicture } from "../../contracts";
import type { MetadataProvider } from "./MetadataProvider";

/** One track of a looked-up album. */
export interface IOnlineAlbumTrack {
  title: string;
  track?: number;
  discNumber?: number;
  duration?: number;
}

/**
 * Album-level result of an online album lookup. Search returns the album
 * fields and a thumbnail only; `tracks` is filled by the track lookup that
 * runs when the result is applied.
 */
export interface IOnlineAlbumMetadata {
  source: MetadataProvider;
  /** Provider id used to fetch the track list on Apply. */
  id: string;
  title: string;
  artist?: string;
  albumArtist?: string;
  year?: number;
  genre?: string;
  trackCount?: number;
  pictures?: IPicture[];
  /** Present once the track list has been fetched. */
  tracks?: IOnlineAlbumTrack[];
}
