import type { ITagData } from "./ITagData";

export interface IMetadataWriter {
  writeTags(file: File, tags: Partial<ITagData>): Promise<boolean>;
}
