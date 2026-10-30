import type { IMetadataStore } from "@/lib/contracts/IMetadataStore";
import { getStore } from "@/core/ports";

/**
 * Domain: Scanning.
 * Open Subsonic equivalent: scanning the library.
 *
 * Access the backing store through the portable store port (the browser
 * binding initializes Dexie + FileSystem behind it on first use).
 */
export function ensureStore(): IMetadataStore {
  return getStore();
}
