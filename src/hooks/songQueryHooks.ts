import { useLiveQuery } from "dexie-react-hooks";
import { mediaDb } from "@/data";
import type { SortingState } from "@tanstack/react-table";

function useSongsInDbStatic() {
  return mediaDb.songs.toArray();
}

function useSongsInDb() {
  return useLiveQuery(() => mediaDb.songs.toArray(), []);
}

function useSongsByArtistInDb(artist: string) {
  return useLiveQuery(
    () => mediaDb.songs.where("artist").equals(artist).toArray(),
    [artist],
  );
}

function useSongsByAlbumInDb(album: string) {
  return useLiveQuery(
    () => mediaDb.songs.where("album").equals(album).toArray(),
    [album],
  );
}

function sortedByReactTable(sorting: SortingState) {
  return useLiveQuery(async () => {
    if (sorting.length === 0) {
      return mediaDb.songs.toArray();
    }

    const { id, desc } = sorting[0];

    const sortable = [
      "title",
      "artist",
      "album",
      "duration",
      "bitrate",
      "mtime",
    ];

    if (!sortable.includes(id)) {
      return mediaDb.songs.toArray();
    }

    let query = mediaDb.songs.orderBy(id as any);
    if (desc) query = query.reverse();

    return query.toArray();
  }, [sorting]);
}

export {
  useSongsInDb,
  useSongsInDbStatic,
  useSongsByArtistInDb,
  useSongsByAlbumInDb,
  sortedByReactTable,
};
