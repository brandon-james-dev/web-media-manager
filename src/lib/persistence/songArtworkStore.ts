import type { ISongArtworkStore } from "./ISongArtworkStore";
import { DexieSongArtworkStore } from "./dexie/DexieSongArtworkStore";

let store: ISongArtworkStore | null = null;

export function getSongArtworkStore(): ISongArtworkStore {
  return (store ??= new DexieSongArtworkStore());
}

export function setSongArtworkStore(next: ISongArtworkStore): void {
  store = next;
}
