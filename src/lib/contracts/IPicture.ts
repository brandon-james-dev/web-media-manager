import type { ArtworkType } from "./ArtworkType";

export interface IPicture {
  mimeType: string;
  /** Raw image bytes. Absent when only the `url` thumbnail is known (search results). */
  data?: Uint8Array;
  /** Thumbnail URL (e.g. search result); the full-size image is fetched on apply. */
  url?: string;
  type: ArtworkType;
  description?: string;
}
