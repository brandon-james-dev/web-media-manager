import type { Song } from "@/models/Song";

export interface IMetadataWriteStrategy {
  write(id: string, updated: Partial<Song>): Promise<Song | null>;
}
