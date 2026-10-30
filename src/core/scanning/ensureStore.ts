import { initMetadataStore } from "@/lib/initMetadataStore";
import type { IMetadataStore } from "@/lib/contracts/IMetadataStore";

/**
 * Domain: Scanning.
 * Open Subsonic equivalent: scanning the library.
 *
 * Seed the backing store (Dexie + File System). Returns the store instance.
 */
export function ensureStore(): IMetadataStore {
  return initMetadataStore();
}
