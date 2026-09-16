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

  function formatLength(length: number | undefined): string {
    if (!length) return "0:00";
    const m = Math.floor(length / 60);
    const s = `${Math.floor(length % 60)}`.padStart(2, "0");
    return `${m}:${s}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-full max-h-4/5 p-0 select-none overflow-auto">
        <div className="flex flex-col sm:flex-row h-full">
          <div className="w-full sm:w-1/3 bg-muted/30 flex flex-col items-center">
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

            <div className="p-3 text-center">
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
              {album.songs
                .sort((a, b) => (a.track ?? 0) - (b.track ?? 0))
                .map((s) => (
                  <div
                    key={s.id}
                    className="
                      flex items-center justify-between
                      p-2 gap-3 rounded-md
                    "
                  >
                    <span className="text-xs text-muted-foreground">
                      {s.track}
                    </span>
                    <span className="font-medium flex-1">{s.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatLength(s.length)}
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
