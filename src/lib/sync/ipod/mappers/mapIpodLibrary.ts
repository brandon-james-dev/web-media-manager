import type { SyncArtwork, SyncPlaylist, SyncTrack } from "@/models";
import type { IpodArtworkDatabase, IpodDatabase } from "../itunesdb/models";

export interface SyncLibrary {
  tracks: SyncTrack[];
  artworks: SyncArtwork[];
  playlists: SyncPlaylist[];
}

export function mapIpodLibrary(
  db: IpodDatabase,
  artworkDb: IpodArtworkDatabase
): SyncLibrary {
  return {
    tracks: db.tracks.map(
      (track): SyncTrack => ({
        id: String(track.id),
        title: track.title,
        artist: track.artist,
        album: track.album,
        durationMs: track.durationMs,
      })
    ),

    artworks: artworkDb.artworks.map(
      (artwork): SyncArtwork => ({
        id: artwork.id,
        formats: artwork.formats,
      })
    ),

    playlists: db.playlists.map(
      (playlist): SyncPlaylist => ({
        id: String(playlist.id),
        name: playlist.name,
        trackIds: playlist.tracks.map((track) => String(track.id)),
      })
    ),
  };
}
