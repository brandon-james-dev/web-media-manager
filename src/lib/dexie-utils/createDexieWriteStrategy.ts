import { getMetadataStore } from "../initMetadataStore";
import type { CombinedMetadataStore } from "../CombinedMetadataStore";
import type { IMetadataWriteStrategy } from "../metadata-utils";
import { DexieWriteStrategy } from "./DexieWriteStrategy";

export function createDexieWriteStrategy(): IMetadataWriteStrategy {
  const store = getMetadataStore() as CombinedMetadataStore;
  const dexieStore = store.getDexieStore();
  return new DexieWriteStrategy(dexieStore);
}
