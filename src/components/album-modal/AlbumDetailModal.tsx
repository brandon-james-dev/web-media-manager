import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Shuffle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { AlbumArtImage } from "@/components/album-art-image";
import { TrackItem } from "@/components/track-item";
import { ItemGroup } from "@/components/ui/item";
import { ThumbnailSize } from "@/lib";
import { wmmBus } from "@/events";
import { usePlayback } from "@/hooks/usePlayback";
import { ShuffleState } from "@/hooks/usePlayback";
import { useIsCompact, useIsPhoneLandscape } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/i18n";
import { cn } from "cn";
import { albumGenre, albumPictureSong, albumYear, trackSorted } from "@/lib/albums/albumDisplay";
import type { Album } from "@/models";
import type { AlbumDetailModalProps } from "./AlbumDetailModalProps";

/**
 * Album detail sheet, opened by a single click on an album in playback mode.
 * Desktop shows a dialog (art left, actions + tracks right); mobile shows the
 * same content as a bottom drawer (art centered on top, title/track count
 * with Play + Shuffle right-aligned, all tracks underneath). A phone held in
 * landscape has no vertical room for that stack, so the drawer switches to the
 * desktop arrangement: art and actions in a left column, tracks on the right.
 */
export function AlbumDetailModal({ album, open, onOpenChange }: AlbumDetailModalProps) {
  // Real playback state, so the Play button reflects what is actually going,
  // including playback started from elsewhere (library rows, artist view).
  const { isPlaying, nowPlaying, shuffle } = usePlayback();
  const { t } = useTranslation();
  const isCompact = useIsCompact();
  // A phone on its side has no vertical room for the stacked drawer (art on
  // top, tracks below), so it uses the desktop arrangement instead: art and
  // actions in a left column, title and tracks on the right.
  const isPhoneLandscape = useIsPhoneLandscape();
  // Manual exit animation: Base UI's `data-ending-style` doesn't run on a
  // programmatic close (its duration is `calc(--drawer-swipe-strength * 400ms)`
  // and the strength var stays 0 off-swipe), so the popup vanishes instantly.
  // Instead, `closing` translates it down for 450 ms, then open flips off.
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function requestClose() {
    if (closing) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setClosing(false);
      onOpenChange(false);
    }, 450);
  }

  useEffect(() => () => clearTimeout(closeTimer.current), []);

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

    if (shuffled && shuffle !== ShuffleState.On) {
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

  const trackCount = t("library.songCount", [tracks.length]);

  const trackList = (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto",
        isPhoneLandscape ? "my-2" : "my-6",
      )}
    >
      <ItemGroup
        className={cn(
          "gap-0! has-data-[size=sm]:gap-0! has-data-[size=xs]:gap-0! divide-y divide-border",
          isCompact && "mx-auto w-full max-w-3xl",
        )}
      >
        {tracks.map((song, i) => (
          <div key={song.id}>
            <TrackItem
              song={song}
              index={i}
              size="sm"
              isPlaying={nowPlaying?.id === song.id}
              showMeta={false}
              onPlay={() => play(song)}
              onClick={isCompact ? () => play(song) : undefined}
              onDoubleClick={isCompact ? undefined : () => play(song)}
            />
          </div>
        ))}
      </ItemGroup>
    </div>
  );

  if (isCompact) {
    return (
      <Drawer
        open={open && !!album}
        onOpenChange={onOpenChange}
        modal={false}
        showSwipeHandle={false}
      >
        {open && !!album && (
          // Below the bottom nav and the player bar, which stay live while the
          // sheet is open; the sheet itself sits in the sheet layer.
          <div
            data-slot="album-drawer-frost"
            aria-hidden="true"
            onClick={requestClose}
            className="fixed inset-0 z-raised bg-black/10 supports-backdrop-filter:backdrop-blur-lg cursor-pointer"
          />
        )}

        {album && (
          <DrawerContent
            className={cn(
              "rounded-xl",
              "mx-auto w-full max-w-3xl",
              "data-[swipe-direction=down]:bottom-(--sheet-offset,9.5rem)",
              isPhoneLandscape
                ? "max-h-[calc(100dvh-var(--sheet-offset,9.5rem)-0.5rem)]"
                : "max-h-[calc(100dvh-var(--sheet-offset,9.5rem)-1.5rem)]",
            )}
            viewportClassName="z-sheet"
          >
            {isPhoneLandscape ? (
              // Landscape: art and actions on the left, title and tracks on the
              // right, so the track list keeps the drawer's full height.
              <div className="flex min-h-0 flex-1 gap-4 p-3">
                <div className="flex w-28 shrink-0 flex-col gap-2">
                  {albumArt}
                  <div className="flex items-center justify-center gap-1.5">
                    {playButton}
                    {shuffleButton}
                  </div>
                </div>

                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <div className="flex shrink-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <DrawerTitle className="truncate text-lg font-bold">
                        {album.title}
                      </DrawerTitle>
                      <div className="truncate text-xs text-muted-foreground">
                        {album.artist}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {meta ? `${meta} · ` : ""}
                        {trackCount}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      aria-label={t("library.closeAlbum")}
                      onClick={requestClose}
                    >
                      <X />
                    </Button>
                  </div>

                  {trackList}
                </div>
              </div>
            ) : (
              <>
                <div className="relative shrink-0 bg-accent/10 px-4 pt-9 pb-4">
                  <div
                    aria-hidden="true"
                    className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted-foreground/25"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-8"
                    aria-label={t("library.closeAlbum")}
                    onClick={requestClose}
                  >
                    <X />
                  </Button>

                  <div className="w-full flex justify-center">
                    <div className="w-40">{albumArt}</div>
                  </div>

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
              </>
            )}
          </DrawerContent>
        )}
      </Drawer>
    );
  }

  return (
    <Dialog open={open && !!album} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-lg max-h-[85dvh] select-none overflow-hidden">
        {album && (
          <>
            <DialogHeader>
              <div className="flex items-end gap-4">
                <div className="w-32 shrink-0 sm:w-40">{albumArt}</div>

                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-xl leading-tight sm:text-2xl">
                    {album.title}
                  </DialogTitle>
                  <div className="mt-1 truncate text-sm text-muted-foreground">{album.artist}</div>
                  <div className="truncate text-sm text-muted-foreground">{meta || trackCount}</div>

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
