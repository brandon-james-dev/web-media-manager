import type { IAudioProperties, IMetadata, ITagData } from ".";

export interface IMetadataReader {
  validate(file: File): Promise<boolean>;
  readTags(file: File): Promise<ITagData | null>;
  readProperties(file: File): Promise<IAudioProperties | null>;
  readMetadata(file: File): Promise<IMetadata | null>;
}
