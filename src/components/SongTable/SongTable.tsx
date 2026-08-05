import type { Song } from "../../models/Song";
import "./song-table.css";

interface SongTableProps {
  songs: Song[];
}

function SongTable({ songs }: SongTableProps) {
  return (
    <div className="song-table-container">
      <table className="song-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Artist</th>
            <th>Album</th>
            <th>Genre</th>
            <th>Year</th>
            <th>Track</th>
            <th>Disc</th>
            <th>Length (s)</th>
            <th>Bitrate (kbps)</th>
            <th>Sample Rate (Hz)</th>
            <th>Channels</th>
            <th>File Size (bytes)</th>
            <th>Path</th>
          </tr>
        </thead>
        <tbody>
          {songs.map((song) => (
            <tr key={song.id}>
              <td>{song.title}</td>
              <td>{song.artist}</td>
              <td>{song.album}</td>
              <td>{song.genre}</td>
              <td>{song.year}</td>
              <td>{song.track}</td>
              <td>{song.disc}</td>
              <td>{song.length}</td>
              <td>{song.bitrate}</td>
              <td>{song.sampleRate}</td>
              <td>{song.channels}</td>
              <td>{song.fileSizeBytes}</td>
              <td>{song.path}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SongTable;
