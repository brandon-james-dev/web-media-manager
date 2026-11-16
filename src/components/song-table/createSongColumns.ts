import { createElement } from "react";
import { createColumnHelper } from "@tanstack/react-table";

import type { Song } from "@/models";
import { formatLength } from "@/lib/formatLength";
import { isSongOffline } from "@/lib/offline";
import { OfflineCell } from "./OfflineCell";

export function createSongColumns(features: any) {
  const columnHelper = createColumnHelper<typeof features, Song>();

  return columnHelper.columns([
    columnHelper.accessor("title", {
      id: "title",
      header: "Title",
      size: 240,
      cell: (info) => info.getValue(),
    }),

    columnHelper.accessor("album", {
      id: "album",
      header: "Album",
      size: 240,
      cell: (info) => info.getValue(),
    }),

    columnHelper.accessor("artist", {
      id: "artist",
      header: "Artist",
      size: 240,
      cell: (info) => info.getValue(),
    }),

    columnHelper.accessor("track", {
      id: "track",
      header: "Track",
      size: 70,
      minSize: 60,
      maxSize: 80,
      cell: (info) => info.getValue(),
    }),

    columnHelper.accessor("genre", {
      id: "genre",
      header: "Genre",
      cell: (info) => info.getValue(),
    }),

    columnHelper.accessor("year", {
      id: "year",
      header: "Year",
      maxSize: 70,
      cell: (info) => info.getValue(),
    }),

    columnHelper.accessor("duration", {
      id: "duration",
      header: "Duration",
      minSize: 90,
      maxSize: 90,

      cell: ({ getValue }) => formatLength(getValue<number>()),
    }),

    columnHelper.accessor("bitrate", {
      id: "bitrate",
      header: "Bitrate",
      size: 100,
      minSize: 80,

      cell: (info) => `${info.getValue()} kbps`,
    }),

    columnHelper.accessor((song) => isSongOffline(song.id), {
      id: "offline",
      header: "Offline",
      size: 80,
      minSize: 70,
      maxSize: 90,
      // Offline is `false`, online `true`, so ascending lists cached songs
      // first — the same order the page-level selector produces.
      sortFn: "basic",
      cell: ({ row }) => createElement(OfflineCell, { song: row.original }),
    }),
  ]);
}
