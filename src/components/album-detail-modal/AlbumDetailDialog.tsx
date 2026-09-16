import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useArtwork } from "@/hooks";
import { ArtworkType } from "@/lib/metadata-utils";
import { ThumbnailSize } from "@/lib";
import { type Song } from "@/models";

export function AlbumDetailDialog({
  open,
  onOpenChange,
  album,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  album: {
    album: string;
    artist: string;
    pictureSongId?: string;
    songs: Song[];
  };
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-full max-h-4/5 p-0 select-none overflow-auto">
        <div className="flex flex-col sm:flex-row h-full">
          <div className="w-full sm:w-1/3 bg-muted/30 flex flex-col items-center">
            <div className="w-full">
              {artUrl ? (
                <img
                  src={artUrl}
                  alt={album.album}
                  className="object-cover rounded-md shadow"
                  draggable="false"
                />
              ) : (
                <div className="w-full aspect-square rounded-md border flex items-center justify-center text-muted-foreground">
                  No Art
                </div>
              )}
            </div>

            <div className="my-3 text-center">
              <div className="text-xl font-semibold">{album.album}</div>
              <div className="text-sm text-muted-foreground">
                {album.artist}
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="mb-4">Songs</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              {album.songs.map((s) => (
                <div
                  key={s.id}
                  className="
                    flex items-center justify-between
                    p-2 rounded-md
                  "
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{s.title}</span>
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {s.track}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
