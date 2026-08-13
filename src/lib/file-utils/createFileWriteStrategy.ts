import { getMetadataStore } from ".";
import type { IMetadataWriteStrategy } from "../metadata-utils";
import { FileSystemMetadataStore } from "./FileSystemMetadataStore";
import { FileWriteStrategy } from "./FileWriteStrategy";

export function createFileWriteStrategy(): IMetadataWriteStrategy {
  const store = getMetadataStore() as FileSystemMetadataStore;
  return new FileWriteStrategy(store);
}
