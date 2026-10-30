import type { IAudioProperties, ITagData } from "@/lib/contracts";

/**
 * Representation of an audio file with its containing id3 tags.
 */
export interface Song extends ITagData, IAudioProperties {
  /**
   * Unique identifier, typically the song's file path and name
   */
  id: string;

  sourceId: string;
  relativePath: string;
  filename: string;
  filesize: number;

  coverFront?: Blob;
  coverBack?: Blob;
}
