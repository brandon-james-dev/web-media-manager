import { Card, CardContent } from "@/components/ui/card";
import type { Album } from "@/models";
import { AlbumArtImage } from "../album-art-image";
import { ThumbnailSize } from "@/lib";

function AlbumCard({
  album,
  onClick,
  className,
}: {
  album: Album;
  onClick?: (album: Album) => void;
  className?: string;
}) {
  return (
    <Card
      className={
        className ?? "aspect-square p-0 relative border hover:border-accent/50"
      }
      onClick={() => onClick?.(album)}
    >
      <div className="absolute top-0 left-0 h-full w-full hover:bg-accent/15 transition duration-100"></div>
      <CardContent className="flex flex-col items-center justify-center p-0 h-full">
        <AlbumArtImage
          songId={album.pictureSongId}
          thumbSize={ThumbnailSize.thumb512}
          fallback={
            <div
              className="
                w-full h-full
                rounded-md border
                flex flex-col items-center justify-center
                px-4
                text-center
                text-muted-foreground
              "
            >
              <div className="font-medium text-sm truncate">{album.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {album.artist}
              </div>
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}

export { AlbumCard };
