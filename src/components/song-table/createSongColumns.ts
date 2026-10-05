import { createColumnHelper } from "@tanstack/react-table";

import type { Song } from "@/models";

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
      maxSize: 50,
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

    columnHelper.accessor("length", {
      id: "length",
      header: "Duration",
      minSize: 90,
      maxSize: 90,

      cell: ({ getValue }) => {
        const d = getValue<number>();

        const m = Math.floor(d / 60);

        const s = `${Math.floor(d % 60)}`.padStart(2, "0");

        return `${m}:${s}`;
      },
    }),

    columnHelper.accessor("bitrate", {
      id: "bitrate",
      header: "Bitrate",
      size: 100,
      minSize: 80,

      cell: (info) => `${info.getValue()} kbps`,
    }),
  ]);
}
