import { getMetadataStore } from "../initMetadataStore";
import type { CombinedMetadataStore } from "../CombinedMetadataStore";
import type { IMetadataWriteStrategy } from "../contracts";
import { DexieWriteStrategy } from "./DexieWriteStrategy";

export function createDexieWriteStrategy(): IMetadataWriteStrategy {
  const store = getMetadataStore() as CombinedMetadataStore;
  const dexieStore = store.getDexieStore();
  return new DexieWriteStrategy(dexieStore);
}
