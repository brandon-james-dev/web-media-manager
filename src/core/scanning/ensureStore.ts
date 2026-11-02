import type { IMetadataStore } from "@/lib/contracts/IMetadataStore";
import { getStore } from "@/core/ports";

/**
 * Domain: Scanning.
 * Open Subsonic equivalent: n/a — internal store access (not an endpoint;
 * the scan entry points are `scanSongs` (≈ startScan) / `addFolder`).
 *
 * Access the backing store through the portable store port (the browser
 * binding initializes Dexie + FileSystem behind it on first use).
 */
export function ensureStore(): IMetadataStore {
  return getStore();
}
