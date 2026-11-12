import type { Metadata } from "@/lib/metadata/Metadata";

/**
 * UI binding model for a song. The tag and audio fields are inherited from
 * `Metadata`; the translation from low-level tag reads happens in the mappers
 * in `core/contracts/mappers.ts`.
 *
 * Cover art is not carried here — it is resolved on demand via
 * `core.media` (`getCoverArt`/`getPictureOfType`) and persisted by the
 * artwork store.
 */
export interface Song extends Metadata {
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

  /**
   * When the app first imported this song (epoch ms). Set by the import,
   * unrelated to any date in the tags.
   */
  addedAt?: number;

  /**
   * When the app last changed this song's stored record, e.g. a re-import
   * that found different data (epoch ms). Unrelated to tag dates.
   */
  updatedAt?: number;
}
