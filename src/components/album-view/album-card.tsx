import React from "react";
import { Card, CardContent } from "../ui/card";
import { AlbumArt } from "./album-art";
import type { Album } from "./types";

interface AlbumCardProps {
  album: Album;
  selected: boolean;
  onSelect: (album: Album) => void;
}

export const AlbumCard = React.memo(function AlbumCard({
  album,
  selected,
  onSelect,
}: AlbumCardProps) {
  return (
    <Card
      key={album.albumName}
      className={`p-0 overflow-clip select-none
        dark:hover:bg-blue-500/30 dark:hover:border-blue-500
        hover:bg-blue-200 hover:border-blue-300
        ${selected ? "dark:bg-blue-500/50 dark:border-blue-300 bg-blue-300 border-blue-500" : ""}
      `}
      onClick={() => onSelect(album)}
    >
      <CardContent className="flex flex-col items-center px-0">
        <figure className="flex flex-col w-full items-center">
          <AlbumArt album={album} />
          <figcaption className="my-1 px-4 w-full text-center text-sm font-medium">
            <div className="overflow-clip text-nowrap text-ellipsis">
              {album.albumName}
            </div>
            <div className="overflow-clip text-nowrap text-ellipsis text-xs dark:text-zinc-300 text-zinc-500">
              {album.artist}
            </div>
          </figcaption>
        </figure>
      </CardContent>
    </Card>
  );
});
