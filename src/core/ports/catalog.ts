import type { MusicSource } from "@/models";
import type { IMetadataStore } from "@/lib/contracts";

/**
 * Catalog store port: the subset of store capabilities the core domain
 * functions rely on (song repository methods + music-source listing and
 * change subscription). Implemented by the platform store (browser
 * CombinedMetadataStore today; a SQLite store on the server later). Core
 * depends on this interface rather than any concrete persistence
 * implementation.
 */
export interface CatalogStore extends IMetadataStore {
  getSources(): Promise<MusicSource[]>;
  /**
   * Mirror a favorite onto the song's source where it has a native notion of
   * one (a local file's rating tag). A no-op when the song has none.
   */
  setFavoriteRating?(songId: string, favorite: boolean): Promise<void>;
  onSourceAdded(cb: (source: MusicSource) => void): () => void;
}
