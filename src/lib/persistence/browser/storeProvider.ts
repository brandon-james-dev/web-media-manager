import { setStoreProvider, type CatalogStore } from "@/core/ports";
import { getMetadataStore } from "../initMetadataStore";

/**
 * Browser store provider.
 *
 * Binds the core's catalog port to the browser persistence implementation
 * (Dexie + FileSystem via CombinedMetadataStore). Called during app
 * bootstrap so core domain functions get the concrete browser store behind
 * the portable port. `getMetadataStore()` lazily constructs the idempotent
 * CombinedMetadataStore singleton, which satisfies the CatalogStore port.
 */
export function registerBrowserStoreProvider(): void {
  setStoreProvider(() => getMetadataStore() as CatalogStore);
}
