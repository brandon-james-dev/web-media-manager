import { getMetadataStore } from ".";
import type { CombinedMetadataStore } from "../browser/CombinedMetadataStore";
import type { IMetadataWriteStrategy } from "../../contracts";
import { FileWriteStrategy } from "./FileWriteStrategy";

export function createFileWriteStrategy(): IMetadataWriteStrategy {
  const store = getMetadataStore() as CombinedMetadataStore;
  const fsStore = store.getFileSystem();
  return new FileWriteStrategy(fsStore);
}
