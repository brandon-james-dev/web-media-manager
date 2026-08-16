import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import type { Song } from "@/models";

export function SongTable({ songs }: { songs: Song[] }) {
  if (songs.length === 0) {
    return (
      <div className="text-muted-foreground p-4 border rounded-md">
        No songs imported yet.
      </div>
    );
  }

  return (
    <Table className="select-none">
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Artist</TableHead>
          <TableHead>Album</TableHead>
          <TableHead>Track</TableHead>
          <TableHead>Year</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {songs.map((song) => (
          <TableRow key={song.id} className="border-b">
            <TableCell>{song.title}</TableCell>
            <TableCell>{song.artist}</TableCell>
            <TableCell>{song.album}</TableCell>
            <TableCell>{song.track}</TableCell>
            <TableCell>{song.year}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
