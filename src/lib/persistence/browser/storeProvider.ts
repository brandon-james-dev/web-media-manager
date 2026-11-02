import {
  setPlaylistStoreProvider,
  setPlaylistWriteProvider,
  setStoreProvider,
  type CatalogStore,
} from "@/core/ports";
import { getMetadataStore } from "../initMetadataStore";
import { DexiePlaylistStore } from "../dexie/DexiePlaylistStore";
import { LocalPlaylistWriteAdapter } from "../playlists/LocalPlaylistWriteAdapter";

/**
 * Browser store provider.
 *
 * Binds the core's catalog port to the browser persistence implementation
 * (Dexie + FileSystem via CombinedMetadataStore). Called during app
 * bootstrap so core domain functions get the concrete browser store behind
 * the portable port. `getMetadataStore()` lazily constructs the idempotent
 * CombinedMetadataStore singleton, which satisfies the CatalogStore port.
 *
 * Playlist writes are source-aware: a local source writes a serialized
 * `.m3u` to its root via `LocalPlaylistWriteAdapter` (the Dexie playlist
 * table remains the app's index of playlists).
 */
export function registerBrowserStoreProvider(): void {
  setStoreProvider(() => getMetadataStore() as CatalogStore);
  setPlaylistStoreProvider(() => new DexiePlaylistStore());
  setPlaylistWriteProvider(() => new LocalPlaylistWriteAdapter());
}
