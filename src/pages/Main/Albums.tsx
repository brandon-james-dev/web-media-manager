import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useSongs } from "@/providers";
import { useArtwork } from "@/hooks";
import { ArtworkType } from "@/lib/metadata-utils";
import { ThumbnailSize } from "@/lib";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlbumDetailDialog } from "@/components/album-detail-dialog";
import type { Song } from "@/models";

export default function Albums() {
  const { filteredSongs } = useSongs();

  const albums = useMemo(() => {
    const map = new Map<
      string,
      {
        album: string;
        artist: string;
        pictureSongId?: string;
        songs: Song[];
      }
    >();

    for (const song of filteredSongs) {
      const album = song.album || "Unknown Album";
      const artist = song.artist || "Unknown Artist";

      if (!map.has(album)) {
        map.set(album, {
          album,
          artist,
          pictureSongId: song.id,
          songs: [song],
        });
      } else {
        map.get(album)!.songs.push(song);
      }
    }

    return Array.from(map.values());
  }, [filteredSongs]);

  return (
    <div className="h-full w-full flex flex-col px-3">
      <ScrollArea className="flex-1 min-h-0 min-w-0 overflow-auto">
        <div
          className="
            grid
            grid-cols-2
            sm:grid-cols-3
            md:grid-cols-4
            lg:grid-cols-5
            xl:grid-cols-6
            p-3 gap-3
          "
        >
          {albums.map((a) => (
            <AlbumCard key={a.album} album={a} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
export function AlbumCard({
  album,
}: {
  album: {
    album: string;
    artist: string;
    pictureSongId?: string;
    songs: Song[];
  };
}) {
  const [open, setOpen] = useState(false);

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
        onClick={() => setOpen(true)}
      >
        <CardContent className="flex flex-col items-center justify-center p-0 h-full">
          {artUrl ? (
            <img
              src={artUrl}
              alt={album.album}
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
              <div className="font-medium text-sm truncate">{album.album}</div>
              <div className="text-xs text-muted-foreground truncate">
                {album.artist}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlbumDetailDialog open={open} onOpenChange={setOpen} album={album} />
    </>
  );
}
