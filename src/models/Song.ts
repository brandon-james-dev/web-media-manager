import type { IAudioProperties, ITagData } from "@/lib/metadata-utils";

/**
 * Representation of an audio file with its containing id3 tags.
 */
export interface Song extends ITagData, IAudioProperties {
  /**
   * Unique identifier, typically the song's file path and name
   */
  id: string;

  directoryId: number;
  relativePath: string;
  filename: string;
  filesize: number;

  coverFront?: Blob;
  coverBack?: Blob;
}
