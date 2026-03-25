import type { Song } from "@/models";
import type { ColumnDef } from "@tanstack/react-table";
import { AlbumArtCell } from "./albumArtCell";

const columns: ColumnDef<Song>[] = [
  {
    id: "albumArt",
    accessorKey: "tags.album",
    header: "Art",
    size: 64,
    enableResizing: false,
    cell: ({ row }) => <AlbumArtCell songId={row.id} />,
  },
  { accessorKey: "tags.title", header: "Title", size: 240, minSize: 80 },
  { accessorKey: "tags.artist", header: "Artist", size: 160, minSize: 80 },
  { accessorKey: "tags.album", header: "Album", size: 240, minSize: 80 },
  { accessorKey: "tags.genre", header: "Genre", size: 140, minSize: 80 },
  {
    accessorKey: "duration",
    header: "Duration",
    size: 80,
    minSize: 60,
    cell: ({ getValue }) => {
      const d = getValue<number>();
      const m = Math.floor(d / 60);
      const s = `${Math.floor(d % 60)}`.padStart(2, "0");
      return `${m}:${s}`;
    },
  },
  {
    accessorKey: "bitrate",
    header: "Bitrate",
    size: 100,
    minSize: 80,
    cell: ({ getValue }) => `${Math.floor(getValue<number>() / 1000)} kbps`,
  },
];

export { columns };
