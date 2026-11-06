import type { Song } from "@/models";

/**
 * The song collection the editor dock's prev/next should walk, published by
 * the page hosting the editor. Pages whose visible list is not derivable
 * from the global filtered songs (e.g. the open playlist's tracks) publish
 * it here; the editor reads the snapshot when it opens, so a freshly
 * mounted dock sees the current context.
 */
let currentNavSongs: Song[] = [];

export function setCurrentNavSongs(songs: Song[]): void {
  currentNavSongs = songs;
}

export function getCurrentNavSongs(): Song[] {
  return currentNavSongs;
}
