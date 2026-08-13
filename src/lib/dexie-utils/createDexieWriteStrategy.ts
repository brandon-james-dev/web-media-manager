import type { IMetadataWriteStrategy } from "../metadata-utils";
import { DexieMetadataStore } from "./DexieMetadataStore";
import { DexieWriteStrategy } from "./DexieWriteStrategy";
import { getMetadataDb } from "./MetadataDb";

export function createDexieWriteStrategy(): IMetadataWriteStrategy {
  const store = new DexieMetadataStore(getMetadataDb());
  return new DexieWriteStrategy(store);
}
