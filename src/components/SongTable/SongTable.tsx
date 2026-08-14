import { getPicturesForSongOfType, ThumbnailSize } from "@/lib";
import { ArtworkType } from "@/lib/metadata-utils";
import type { Song } from "@/models/Song";

interface SongTableProps {
  songs: Song[];
  selectedSong?: Song | null;
  selectedBatch: Set<string>;
  onSelectSong?: (song: Song) => void;
  onToggleBatch?: (song: Song) => void;
}

export function SongTable({
  songs,
  selectedSong,
  selectedBatch,
  onSelectSong,
  onToggleBatch,
}: SongTableProps) {
  const handleSelectedSong = async (song: Song) => {
    const coverFrontData = (
      await getPicturesForSongOfType(
        song.id,
        ArtworkType.FrontCover,
        ThumbnailSize.thumb256
      )
    ).at(0)?.data;

    let coverFront: Blob | undefined;

    if (coverFrontData) {
      coverFront = new Blob([coverFrontData.slice()]);
    }
    const coverBackData = (
      await getPicturesForSongOfType(
        song.id,
        ArtworkType.BackCover,
        ThumbnailSize.thumb256
      )
    ).at(0)?.data;

    let coverBack: Blob | undefined;

    if (coverBackData) {
      coverBack = new Blob([coverBackData.slice()]);
    }

    onSelectSong?.({ ...song, coverFront, coverBack });
  };

  return (
    <div className="song-table-container">
      <table className="song-table">
        <thead>
          <tr>
            <th>Select</th>
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
            const isBatch = selectedBatch.has(song.id);

            return (
              <tr
                key={song.id}
                className={isSelected ? "selected-row" : ""}
                onClick={() => handleSelectedSong(song)}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={isBatch}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleBatch?.(song);
                    }}
                  />
                </td>

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
