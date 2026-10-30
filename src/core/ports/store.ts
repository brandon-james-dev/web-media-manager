import type { CatalogStore } from "./catalog";

/**
 * Port the application core depends on for its backing metadata store.
 *
 * The core domain functions call through this port so they never need to
 * know which persistence implementation sits behind it. The concrete
 * store (browser: Dexie + FileSystem; server: SQLite, later) is provided
 * by a platform binding via `setStoreProvider`, resolved once during
 * bootstrap.
 *
 * Keeping the port bound to `CatalogStore` (a portable interface) means a
 * server binding can supply its own store without the core changing.
 */
let storeProvider: (() => CatalogStore) | null = null;

/** Register the platform's store provider before the store is first used. */
export function setStoreProvider(provider: () => CatalogStore): void {
  storeProvider = provider;
}

/** Access the current store through the portable catalog port. */
export function getStore(): CatalogStore {
  if (!storeProvider) {
    throw new Error(
      "[core/ports/store] No store provider registered — call setStoreProvider() during bootstrap."
    );
  }
  return storeProvider();
}
