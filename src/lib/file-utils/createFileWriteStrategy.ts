import { getMetadataStore } from ".";
import type { CombinedMetadataStore } from "../CombinedMetadataStore";
import type { IMetadataWriteStrategy } from "../metadata-utils";
import { FileWriteStrategy } from "./FileWriteStrategy";

export function createFileWriteStrategy(): IMetadataWriteStrategy {
  const store = getMetadataStore() as CombinedMetadataStore;
  const fsStore = store.getFileSystem();
  return new FileWriteStrategy(fsStore);
}
