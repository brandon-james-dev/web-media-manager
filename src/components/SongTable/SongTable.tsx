import type { Song } from "@/models/Song";
import "./song-table.css";

interface SongTableProps {
  songs: Song[];
  selectedSong?: Song | null;
  onSelectSong?: (song: Song) => void;
}

export function SongTable({
  songs,
  selectedSong,
  onSelectSong,
}: SongTableProps) {
  return (
    <div className="song-table-container">
      <table className="song-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Artist</th>
            <th>Album</th>
            <th>Track</th>
            <th>Year</th>
            <th>Genre</th>
          </tr>
        </thead>

        <tbody>
          {songs.map((song) => {
            const isSelected = selectedSong && selectedSong.id === song.id;

            return (
              <tr
                key={song.id}
                className={isSelected ? "selected-row" : ""}
                onClick={() => onSelectSong?.(song)}
              >
                <td>{song.title}</td>
                <td>{song.artist}</td>
                <td>{song.album}</td>
                <td>{song.track}</td>
                <td>{song.year}</td>
                <td>{song.genre}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default SongTable;
