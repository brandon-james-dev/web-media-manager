import { useMemo } from "react";
import { Play, Pause, Shuffle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { AlbumArtImage } from "@/components/album-art-image";
import { TrackItem } from "@/components/track-item";
import { ItemGroup } from "@/components/ui/item";
import { ThumbnailSize } from "@/lib";
import { wmmBus } from "@/events";
import { usePlayback } from "@/hooks/usePlayback";
import { shuffleState } from "@/hooks/usePlayback";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { albumGenre, albumPictureSong, albumYear, trackSorted } from "@/lib/albums/albumDisplay";
import type { Album } from "@/models";
import type { AlbumDetailModalProps } from "./AlbumDetailModalProps";

/**
 * Album detail sheet, opened by a single click on an album in playback mode.
 * Desktop shows a dialog (art left, actions + tracks right); mobile shows the
 * same content as a bottom drawer (art centered on top, title/track count
 * with Play + Shuffle right-aligned, all tracks underneath).
 */
export function AlbumDetailModal({ album, open, onOpenChange }: AlbumDetailModalProps) {
  // Real playback state, so the Play button reflects what is actually going,
  // including playback started from elsewhere (library rows, artist view).
  const { isPlaying, nowPlaying, shuffle } = usePlayback();
  const isMobile = useIsMobile();

  const tracks = useMemo(() => (album ? trackSorted(album) : []), [album]);

  // The album is "current" when the playing track belongs to it.
  const isAlbumCurrent = !!album && !!nowPlaying && tracks.some((s) => s.id === nowPlaying.id);
  const meta = useMemo(() => {
    if (!album) return "";
    return [albumGenre(album), albumYear(album)].filter(Boolean).join(" · ");
  }, [album]);

  /** Play the album's tracks, starting at `song`; `shuffled` reorders. */
  function play(song: Album["songs"][number], shuffled = false) {
    const ids = tracks.map((s) => s.id);
    if (!ids.length) return;

    if (shuffled && shuffle !== shuffleState.On) {
      // The provider shuffles the queue itself; flip it on for this album.
      wmmBus.invoke("wmm.playback.toggleShuffle");
    }

    wmmBus.invoke("wmm.playback.playQueue", { songIds: ids });
    wmmBus.invoke("wmm.playback.playSong", { songId: song.id });
  }

  const albumArt = album && (
    <div className="aspect-square rounded-lg overflow-hidden border bg-muted shadow-sm">
      <AlbumArtImage
        songId={album.pictureSongId ?? albumPictureSong(album)?.id}
        thumbSize={ThumbnailSize.thumb512}
        className="w-full h-full object-cover"
        fallback={
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-3 text-center text-muted-foreground">
            <div className="font-semibold text-[13px] truncate">{album.title}</div>
            <div className="text-xs truncate">{album.artist}</div>
          </div>
        }
      />
    </div>
  );

  const playButton = (
    <Button
      className="bg-accent/50 hover:bg-accent/70 rounded-full aspect-square text-white"
      disabled={tracks.length === 0}
      onClick={() => {
        if (isAlbumCurrent) {
          wmmBus.invoke("wmm.playback.playpause");
          return;
        }
        const first = tracks[0];
        if (first) play(first);
      }}
    >
      {isAlbumCurrent && isPlaying ? (
        <Pause className="fill-current" />
      ) : (
        <Play className="fill-current" />
      )}
    </Button>
  );

  const shuffleButton = (
    <Button
      size="sm"
      variant="ghost"
      disabled={tracks.length === 0}
      onClick={() => {
        const first = tracks[0];
        if (first) play(first, true);
      }}
    >
      <Shuffle />
    </Button>
  );

  const trackCount = `${tracks.length} ${tracks.length === 1 ? "song" : "songs"}`;

  const trackList = (
    <div className="min-h-0 flex-1 overflow-y-auto my-6">
      <ItemGroup className="gap-0! has-data-[size=sm]:gap-0! has-data-[size=xs]:gap-0! divide-y divide-border">
        {tracks.map((song, i) => (
          <div key={song.id}>
            <TrackItem
              song={song}
              index={i}
              size="sm"
              isPlaying={nowPlaying?.id === song.id}
              showMeta={false}
              onPlay={() => play(song)}
            />
          </div>
        ))}
      </ItemGroup>
    </div>
  );

  if (isMobile) {
    // The drawer popup is `fixed bottom-0`, which would bury the mobile
    // playback dock and the bottom nav. It is anchored above them instead
    // (9.5rem ≈ dock + nav row + gaps), capped below the header, and its
    // closed transform is extended by the same offset so swiping still
    // slides it fully out of view.
    return (
      <Drawer
        open={open && !!album}
        onOpenChange={onOpenChange}
        // Non-modal so the mini-player keeps working underneath the sheet
        // (play/pause stays reachable without closing it). Close via swipe,
        // the X, or tapping another album.
        modal={false}
      >
        {album && (
          <DrawerContent className="rounded-b-none data-[swipe-direction=down]:bottom-32 max-h-[calc(100dvh-11rem)] data-[swipe-direction=down]:[--closed-transform:translate3d(0,calc(100%+9.5rem+2px),0)] p-0 overflow-hidden">
            <div className="shrink-0 bg-accent/10 px-4 pt-5 pb-4">
              <DrawerHeader className="self-center select-none">
                <div className="w-40">{albumArt}</div>
              </DrawerHeader>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <DrawerTitle className="min-w-0 truncate text-xl font-bold">
                    {album.title}
                  </DrawerTitle>
                  <div className="mt-0.5 truncate text-sm text-muted-foreground">
                    {album.artist}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {meta ? `${meta} · ` : ""}
                    {trackCount}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {playButton}
                  {shuffleButton}
                </div>
              </div>
            </div>

            {trackList}
          </DrawerContent>
        )}
      </Drawer>
    );
  }

  return (
    <Dialog open={open && !!album} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] overflow-hidden">
        {album && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-4">
                {/* Album art, shown once. */}
                <div className="w-32 shrink-0 self-start sm:w-40">{albumArt}</div>

                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-xl leading-tight sm:text-2xl">
                    {album.title}
                  </DialogTitle>
                  <div className="mt-1 truncate text-sm text-muted-foreground">{album.artist}</div>
                  <div className="truncate text-sm text-muted-foreground">{meta || trackCount}</div>

                  {/* Actions: play/pause this album, shuffle it, or open its
                      editor (which closes the modal). */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {playButton}
                    {shuffleButton}
                  </div>
                </div>
              </div>
            </DialogHeader>

            {trackList}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
