import type { Song } from "@/models/Song";
import type { ITagData } from "./ITagData";

export interface IMetadataWriteStrategy {
  write(id: string, updated: Partial<ITagData>): Promise<Song | null>;
}
