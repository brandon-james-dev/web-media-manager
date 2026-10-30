import type { IPicture } from "@/lib/contracts/IPicture";

/**
 * UI binding model for a song. Independent of the low-level tag-reading
 * contracts (`ITagData`/`IAudioProperties`); tag/audio data is translated
 * into these fields via the mappers in `core/contracts/mappers.ts`.
 *
 * Cover art is not carried here — it is resolved on demand via
 * `core.media` (`getCoverArt`/`getPictureOfType`) and persisted by the
 * artwork store.
 */
export interface Song {
  /**
   * Unique identifier for the song.
   */
  id: string;

  /** The music source this song belongs to (e.g. an "on device" source). */
  sourceId: string;

  /** Path of the song relative to its source root. */
  relativePath: string;

  /** File name. */
  filename: string;

  /** File size in bytes. */
  filesize: number;

  // ---- Embedded pictures (tag artwork; Blob-based, UI-bound) ----
  pictures?: IPicture[];

  // ---- Tag-derived fields (mapped from ITagData) ----
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  comment?: string;
  composer?: string;
  year?: number;
  track?: number;
  totalTracks?: number;
  discNumber?: number;
  totalDiscs?: number | string;
  lyrics?: string;
  copyright?: string;
  encodedBy?: string;
  bpm?: number;
  isrc?: string;

  mbTrackId?: string;
  mbArtistId?: string;
  mbReleaseGroupId?: string;

  // ---- Audio properties (mapped from IAudioProperties) ----
  length?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
}
