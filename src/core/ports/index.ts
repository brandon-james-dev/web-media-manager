/**
 * Core ports.
 *
 * Portable interfaces the core domain functions depend on. Each is
 * implemented by a platform binding (browser, tauri, server) and wired in
 * during bootstrap. Keeping the core dependent only on these ports (and on
 * `./contracts`) is what lets it run on any platform.
 */
export { getStore, setStoreProvider } from "./store";
export type { CatalogStore } from "./catalog";
export { getMetadataReader, setMetadataReaderProvider } from "./metadataReader";
export { getSourcesStore, setSourcesProvider } from "./sources";
export type { MusicSourceRepository } from "./sources";
export { getPlaylistStore, setPlaylistStoreProvider } from "./playlists";
export type { PlaylistStore } from "./playlists";
export { getPlaylistWriteAdapter, setPlaylistWriteProvider } from "./playlists";
export type { PlaylistWriteAdapter } from "./playlists";
