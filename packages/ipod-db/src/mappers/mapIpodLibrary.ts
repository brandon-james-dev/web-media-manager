import type { IpodArtworkDatabase, IpodDatabase } from "@ipod-db";
import type { SyncLibrary } from "@/models/SyncLibrary";
import type { SyncArtwork, SyncPlaylist, SyncTrack } from "@/models";

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
        id: `${playlist.id}`,
        name: `${playlist.name}${playlist.type == "master" ? " (Master)" : ""}`,
        trackIds: playlist.tracks.map((track) => String(track.id)),
      })
    ),
  };
}
