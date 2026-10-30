import type { Song } from "@/models";
import { getStore } from "@/core/system";
import { songToChild } from "@/core/contracts";
import { selectors } from "@/lib/repository";
import type { SearchParams, SearchResult } from "./types";

/**
 * Domain: Searching.
 * Open Subsonic equivalent: search3().
 *
 * Searches the local song store across title/artist/album.
 */
export async function search(params: SearchParams): Promise<SearchResult> {
  const query = params.query.trim().toLowerCase();

  const store = getStore();
  const { data } = await store.filter({
    filter: (s: Song) =>
      Boolean(
        s.title?.toLowerCase().includes(query) ||
          s.artist?.toLowerCase().includes(query) ||
          s.album?.toLowerCase().includes(query)
      ),
    sort: { selector: selectors.title, desc: false },
  });

  const songCount = params.songCount ?? 20;
  const songs = data.slice(0, songCount);

  const artists = new Map<string, string>();
  const albums = new Map<string, string>();
  for (const s of data) {
    if (s.artist) artists.set(s.artist.toLowerCase(), s.artist);
    if (s.album) albums.set(s.album.toLowerCase(), s.album);
  }

  const artistList = Array.from(artists.values()).slice(
    0,
    params.artistCount ?? 10
  );
  const albumList = Array.from(albums.values()).slice(
    0,
    params.albumCount ?? 10
  );

  return {
    artist: artistList.map((name) => ({ id: `artist-${name}`, name })),
    album: albumList.map((name) => ({ id: `album-${name}`, name })),
    song: songs.map(songToChild),
  };
}
