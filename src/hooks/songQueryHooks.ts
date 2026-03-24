import { useLiveQuery } from "dexie-react-hooks";
import { mediaDb } from "@/data";
import { useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import type { Song } from "@/models";

function useSongsInDbStatic() {
  return mediaDb.songs.toArray();
}

function useSongsInDb() {
  return useLiveQuery(() => mediaDb.songs.toArray(), []);
}

function useSongById(id: string) {
  const [song, setSong] = useState<Song | null>(null);

  useEffect(() => {
    if (!id) {
      setSong(null);
      return;
    }

    let cancelled = false;

    async function load() {
      const result = await mediaDb.songs.get(id);
      if (!cancelled) setSong(result ?? null);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return song;
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
  useSongById,
  useSongsByArtistInDb,
  useSongsByAlbumInDb,
  sortedByReactTable,
};
