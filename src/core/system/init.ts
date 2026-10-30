import { getMetadataStore, initMetadataStore } from "@/lib/initMetadataStore";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";

/**
 * Initialize the backing store (Dexie + File System stores) if needed.
 * Used to make sure the composition root exists before any domain
 * endpoint touches it.
 */
export function ensureInitialized(): void {
  initMetadataStore();
}

/** Access the current backing store instance. */
export function getStore(): CombinedMetadataStore {
  return getMetadataStore() as CombinedMetadataStore;
}
