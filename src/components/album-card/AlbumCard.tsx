import { Card, CardContent } from "@/components/ui/card";
import { useArtwork } from "@/hooks";
import { ArtworkType } from "@/lib/metadata-utils";
import { ThumbnailSize } from "@/lib";
import type { Album } from "@/models";

function AlbumCard({
  album,
  onClick,
}: {
  album: Album;
  onClick?: (album: Album) => void;
}) {
  const artwork = useArtwork(
    album.pictureSongId!,
    ArtworkType.FrontCover,
    ThumbnailSize.thumb256
  );

  function getAlbumArt(): string | undefined {
    if (!artwork || artwork.length === 0) return undefined;

    const pic = artwork[0];
    const blob = new Blob([pic.data.slice()], { type: pic.mimeType });
    return URL.createObjectURL(blob);
  }

  const artUrl = getAlbumArt();

  return (
    <>
      <Card
        className="cursor-pointer transition hover:shadow-md aspect-square p-0"
        onClick={() => onClick?.(album)}
      >
        <CardContent className="flex flex-col items-center justify-center p-0 h-full">
          {artUrl ? (
            <img
              src={artUrl}
              alt={album.title}
              draggable="false"
              className="object-cover rounded-md shadow w-full h-full"
            />
          ) : (
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
          )}
        </CardContent>
      </Card>
    </>
  );
}

export { AlbumCard };
