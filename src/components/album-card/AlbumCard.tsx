import { Card, CardContent } from "@/components/ui/card";
import type { Album } from "@/models";
import { AlbumArtImage } from "../album-art-image";
import { ThumbnailSize } from "@/lib";

function AlbumCard({
  album,
  onClick,
}: {
  album: Album;
  onClick?: (album: Album) => void;
}) {
  return (
    <>
      <Card
        className="cursor-pointer aspect-square p-0"
        onClick={() => onClick?.(album)}
      >
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
                <div className="font-medium text-sm truncate">
                  {album.title}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {album.artist}
                </div>
              </div>
            }
          />
        </CardContent>
      </Card>
    </>
  );
}

export { AlbumCard };
