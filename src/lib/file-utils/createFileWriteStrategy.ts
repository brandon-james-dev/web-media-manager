import type { IMetadataWriteStrategy } from "../metadata-utils";
import type { IMetadataStore } from "./../metadata-utils/IMetadataStore";
import { FileWriteStrategy } from "./FileWriteStrategy";

export function createFileWriteStrategy(
  store: IMetadataStore
): IMetadataWriteStrategy {
  return new FileWriteStrategy(store);
}
