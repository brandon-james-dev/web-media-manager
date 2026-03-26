import { useLiveQuery } from "dexie-react-hooks";
import { mediaDb } from "@/data";
import { useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import type { Song } from "@/models";
import type { Album } from "@/components/album-view/types";
import { getStaticThumbnail } from "./thumbnailQueryHooks";

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
    () => mediaDb.songs.where("tags.artist").equals(artist).toArray(),
    [artist],
  );
}

function useSongsByAlbumInDb(album: string) {
  return useLiveQuery(
    () => mediaDb.songs.where("tags.album").equals(album).toArray(),
    [album],
  );
}

export function useAlbums() {
  function normalizeName(name: string): string {
    return name
      .normalize("NFD") // split accents
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-zA-Z0-9 ]/g, "") // remove special characters
      .toLowerCase()
      .trim();
  }

  return useLiveQuery(async () => {
    const songs = await mediaDb.songs.toArray();

    const uniqueAlbums = Array.from(
      new Set(songs.map((s) => s.tags?.album)).values(),
    ).filter(Boolean);

    const albums = new Map<string, Album>();

    for (const album of uniqueAlbums) {
      const albumSongs = songs.filter((s) => s.tags?.album === album);
      const artist = albumSongs.at(0)?.tags?.artist;
      const { thumbXLarge } = await getStaticThumbnail(albumSongs.at(0)!.id);

      albums.set(album!, {
        albumName: album!,
        art: thumbXLarge || undefined,
        artist: artist || "Unknown Artist",
        songs: albumSongs,
      });
    }

    const sorted = Array.from(albums.values()).sort((a, b) => {
      const aName = normalizeName(a.albumName);
      const bName = normalizeName(b.albumName);

      if (aName === "unknown album") return 1;
      if (bName === "unknown album") return -1;

      return aName.localeCompare(bName);
    });

    return sorted;
  });
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
