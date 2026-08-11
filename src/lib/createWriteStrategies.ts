import { createCombinedWriteStrategy } from "./createCombinedWriteStrategy";
import { createFileWriteStrategy } from "./file-utils/createFileWriteStrategy";
import type { IMetadataStore } from "./metadata-utils/IMetadataStore";

export function createWriteStrategies(store: IMetadataStore) {
  return {
    file: createFileWriteStrategy(store),
    // dexie: new DexieWriteStrategy(store),
    all: createCombinedWriteStrategy(
      createFileWriteStrategy(store)
      //   new DexieWriteStrategy(store)
    ),
  };
}
