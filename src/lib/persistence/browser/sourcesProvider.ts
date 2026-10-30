import { setSourcesProvider, type MusicSourceRepository } from "@/core/ports";
import { getMetadataStore } from "../initMetadataStore";
import type { CombinedMetadataStore } from "./CombinedMetadataStore";

/**
 * Browser music-source repository binding.
 *
 * Binds the core's source port to the browser persistence layer (Dexie +
 * FileSystem sources via the CombinedMetadataStore). Wired in during
 * bootstrap so `getSourcesStore()` returns the configured on-device sources
 * through the portable port.
 */
function browserSourceRepository(): MusicSourceRepository {
  const store = getMetadataStore() as CombinedMetadataStore;

  return {
    getSources: () => store.getSources(),
    addSource: (source) => store.addSource(source),
    deleteSource: (id) => store.deleteSource(id),
    onSourceAdded: (cb) => store.onSourceAdded(cb),
    onSourceDeleted: (cb) => store.onSourceDeleted(cb),
    onSourcesCleared: (cb) => store.onSourcesCleared(cb),
  };
}

/** Register the browser source repository for the app's core. */
export function registerBrowserSourceProvider(): void {
  setSourcesProvider(browserSourceRepository);
}
