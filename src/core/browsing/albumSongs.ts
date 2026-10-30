import { getStore } from "@/core/system";
import { songToChild } from "@/core/contracts";
import type { Child } from "@/core/contracts";
import { selectors } from "@/lib/persistence";
import type { Song } from "@/models";
import type { QueryOptions } from "@/lib/persistence";

/**
 * Domain: Browsing.
 * Open Subsonic equivalent: getSongsByGenre().
 */
export async function getSongsByGenre(genre: string): Promise<Child[]> {
  const store = getStore();
  const { data } = await store.filter({ filter: (s) => s.genre === genre });
  return data.map(songToChild);
}

/**
 * Domain: Browsing.
 * Open Subsonic equivalent: getAlbum(s) — the album's songs.
 */
export async function getAlbumSongs(albumName: string): Promise<Child[]> {
  const store = getStore();
  const { data } = await store.filter({
    filter: (s) => s.album === albumName,
    sort: { selector: selectors.title, desc: false },
  } satisfies QueryOptions<Song>);
  return data.map(songToChild);
}
