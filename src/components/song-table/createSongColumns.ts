import { createElement } from "react";
import { createColumnHelper } from "@tanstack/react-table";

import type { Song } from "@/models";
import type { UseTranslationResult, WmmResourceKey } from "@/i18n";
import { formatTrackDuration } from "@/lib/format";
import { isSongOffline } from "@/lib/offline";
import { OfflineCell } from "./OfflineCell";

/** Header text of each song column, resolved through the active language. */
export const SONG_COLUMN_LABEL_KEYS = {
  title: "metadata.title",
  album: "metadata.album",
  artist: "metadata.artist",
  track: "metadata.track",
  genre: "metadata.genre",
  year: "metadata.year",
  duration: "metadata.duration",
  bitrate: "metadata.bitrate",
  offline: "library.offline",
} as const satisfies Record<string, WmmResourceKey>;

export function createSongColumns(
  features: any,
  t: UseTranslationResult["t"]
) {
  const columnHelper = createColumnHelper<typeof features, Song>();

  return columnHelper.columns([
    columnHelper.accessor("title", {
      id: "title",
      header: () => t("metadata.title"),
      size: 240,
      cell: (info) => info.getValue(),
    }),

    columnHelper.accessor("album", {
      id: "album",
      header: () => t("metadata.album"),
      size: 240,
      cell: (info) => info.getValue(),
    }),

    columnHelper.accessor("artist", {
      id: "artist",
      header: () => t("metadata.artist"),
      size: 240,
      cell: (info) => info.getValue(),
    }),

    columnHelper.accessor("track", {
      id: "track",
      header: () => t("metadata.track"),
      size: 70,
      minSize: 60,
      maxSize: 80,
      cell: (info) => info.getValue(),
    }),

    columnHelper.accessor("genre", {
      id: "genre",
      header: () => t("metadata.genre"),
      cell: (info) => info.getValue(),
    }),

    columnHelper.accessor("year", {
      id: "year",
      header: () => t("metadata.year"),
      maxSize: 70,
      cell: (info) => info.getValue(),
    }),

    columnHelper.accessor("duration", {
      id: "duration",
      header: () => t("metadata.duration"),
      minSize: 90,
      maxSize: 90,

      cell: ({ getValue }) => formatTrackDuration(getValue<number>()),
    }),

    columnHelper.accessor("bitrate", {
      id: "bitrate",
      header: () => t("metadata.bitrate"),
      size: 100,
      minSize: 80,

      cell: (info) => `${info.getValue()} kbps`,
    }),

    columnHelper.accessor((song) => isSongOffline(song.id), {
      id: "offline",
      header: () => t("library.offline"),
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
