import type { MetadataRating } from "@/lib/metadata/Metadata";
import type { ITagData } from "./ITagData";

export interface IMetadataWriter {
  writeTags(file: File, tags: Partial<ITagData>): Promise<Uint8Array>;
  /** Replace the file's embedded ratings, leaving every other tag untouched. */
  writeRatings(file: File, ratings: MetadataRating[]): Promise<Uint8Array>;
}
