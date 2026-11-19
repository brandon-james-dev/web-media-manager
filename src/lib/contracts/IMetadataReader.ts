import type { IAudioProperties, IMetadata, ITagData } from ".";

export interface IMetadataReader {
  validate(file: File): Promise<boolean>;
  readTags(file: File): Promise<ITagData | null>;
  readProperties(file: File): Promise<IAudioProperties | null>;
  readMetadata(file: File): Promise<IMetadata | null>;
  /**
   * Read many files in one batched pass, preserving input order. A file that
   * cannot be read yields `null` in its own slot instead of failing the batch,
   * so a bulk import keeps going past a corrupt file.
   */
  readMetadataMany(files: File[]): Promise<Array<IMetadata | null>>;
}
