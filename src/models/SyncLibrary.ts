import type { SyncArtwork } from "./SyncArtwork";
import type { SyncPlaylist } from "./SyncPlaylist";
import type { SyncTrack } from "./SyncTrack";

export interface SyncLibrary {
  tracks: SyncTrack[];
  artworks: SyncArtwork[];
  playlists: SyncPlaylist[];
}
