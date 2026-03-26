import { type RefObject } from "react";
import type { Album } from "./types";
import { AlbumCard } from "./album-card";

export interface AlbumViewProps {
  albums: Album[];
  onSelectAlbums: (albums: Album[]) => void;
  selectedAlbums?: Album[];
  isBulkSelectEnabled: RefObject<boolean>;
}

export function AlbumView(props: AlbumViewProps) {
  const { albums, onSelectAlbums, selectedAlbums = [], isBulkSelectEnabled } = props;

  async function handleSelect(album: Album) {
    if (selectedAlbums.includes(album)) {
      onSelectAlbums(
        selectedAlbums.filter((a) => a.albumName !== album.albumName),
      );
    } else {
      if (isBulkSelectEnabled.current) {
        onSelectAlbums(selectedAlbums.concat(album));
      } else {
        onSelectAlbums([album]);
      }
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 p-4">
      {albums.map((album) => (
        <AlbumCard
          key={album.albumName}
          album={album}
          selected={selectedAlbums.includes(album)}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
