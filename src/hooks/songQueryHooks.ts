import { useLiveQuery } from "dexie-react-hooks";
import { mediaDb } from "@/data";

function useSongsInDb() {
  return useLiveQuery(() => mediaDb.songs.toArray(), []);
}

function useSongsByArtistInDb(artist: string) {
  return useLiveQuery(
    () => mediaDb.songs.where("artist").equals(artist).toArray(),
    [artist]
  );
}

function useSongsByAlbumInDb(album: string) {
  return useLiveQuery(() => mediaDb.songs.where("album").equals(album).toArray(), [album] );
}

export { useSongsInDb, useSongsByArtistInDb, useSongsByAlbumInDb };