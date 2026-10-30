import type { Song, MusicSource } from "@/models";
import type { IAudioProperties, ITagData } from "@/lib/contracts";
import type { Child, MusicFolder, AlbumID3 } from "./models";

/**
 * Map low-level tag/audio data into the tag-facing fields of a Song. The
 * Song model is independent of the tag contracts — the translation happens
 * here — so reading a file never couples the Song shape to ITagData.
 */
export function applyTagDataToSong(
  song: Song,
  tags?: ITagData | null,
  props?: IAudioProperties | null
): Song {
  return {
    ...song,
    ...tags,
    ...props,
  };
}

/** Convert a stored Song into the Open Subsonic `Child` view. */
export function songToChild(song: Song): Child {
  return {
    id: song.id,
    title: song.title ?? "",
    artist: song.artist,
    artistId: song.artist ? artistId(song.artist) : undefined,
    album: song.album,
    albumId: song.album ? albumId(song.album) : undefined,
    coverArt: song.id, // artwork is keyed by songId
    genre: song.genre,
    year: song.year,
    track: song.track,
    discNumber: song.discNumber,
    duration: song.length,
    bitRate: song.bitrate,
    size: song.filesize,
    path: song.relativePath,
    suffix: song.filename?.split(".").pop(),
    isDir: false,
    isVideo: false,
  };
}

/** Stable id for an artist, derived from its name. */
export function artistId(name: string): string {
  return `artist-${name.trim().toLowerCase().replace(/\s+/g, "-")}`;
}

/** Stable id for an album, derived from artist + album name. */
export function albumId(albumName: string): string {
  return `album-${albumName.trim().toLowerCase().replace(/\s+/g, "-")}`;
}

/** Convert a local MusicSource into the Open Subsonic `MusicFolder` view. */
export function musicSourceToMusicFolder(source: MusicSource): MusicFolder {
  return { id: source.id, name: source.name };
}

/**
 * Group songs into album views, matching the on-screen album grouping that
 * lives in `Albums.tsx` / `Editor.tsx` today. Keeping the derivation here
 * (once) so the UI no longer has to recompute it in each caller.
 */
export function songsToAlbums(songs: Song[]): AlbumID3[] {
  const byKey = new Map<string, { name: string; artist: string; songs: Song[] }>();

  for (const song of songs) {
    const key = albumId(song.album ?? "");
    let entry = byKey.get(key);
    if (!entry) {
      entry = { name: song.album ?? "Unknown", artist: song.artist ?? "", songs: [] };
      byKey.set(key, entry);
    }
    entry.songs.push(song);
  }

  return Array.from(byKey.values()).map(({ name, artist, songs }) => ({
    id: albumId(name),
    name,
    artist,
    artistId: artist ? artistId(artist) : undefined,
    coverArt: songs[0]?.id, // artwork is resolved by song id
    songCount: songs.length,
    duration: songs.reduce((sum, s) => sum + (s.length ?? 0), 0),
    year: songs.reduce((max, s) => Math.max(max, s.year ?? 0), 0),
    genre: songs[0]?.genre,
  }));
}
