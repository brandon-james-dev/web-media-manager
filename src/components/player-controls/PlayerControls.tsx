import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  RepeatOff,
  Repeat1,
  Repeat2,
  Disc3,
  Shuffle,
  ListMusic,
  PauseCircle,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThumbnailSize } from "@/lib";
import { Slider } from "@/components/ui/slider";
import { repeatState, shuffleState, usePlayback } from "@/hooks/usePlayback";
import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Song } from "@/models";
import { AlbumArtImage } from "@/components/album-art-image";
import { keyShortcut$ } from "@/events/keyboard-events";
import { wmmBus } from "@/events";
import { useIsCompact } from "@/lib/hooks/useIsMobile";
import { formatLength } from "@/lib/formatLength";

export function PlayerControls() {
  //#region State
  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(false);
  const [trackPosition, setTrackPosition] = useState<number>(0);
  // Elapsed-time readout ticks once a second; the progress bar keeps its own
  // (faster) rate from trackPosition.
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  // Which track the readout belongs to (see the reset below).
  const [elapsedSongId, setElapsedSongId] = useState<string | undefined>(undefined);
  // Mobile renders a compact mini-player (now-playing info + one large play
  // button) instead of the wide three-column bar, whose controls are too
  // small to reach with a thumb.
  const isCompact = useIsCompact();
  const {
    playlist,
    nowPlayingIndex,
    nowPlaying,
    shuffle,
    repeat,
    volume,
    isPlaying,
    getCurrentTime,
  } = usePlayback();

  // When playback rolls onto the next track the readout restarts at zero
  // immediately, instead of showing the previous track's time until the next
  // one-second tick. Adjusting state during render (rather than in an effect)
  // is React's documented pattern for reacting to a changed prop.
  if (elapsedSongId !== nowPlaying?.id) {
    setElapsedSongId(nowPlaying?.id);
    setElapsedSeconds(0);
  }
  //#endregion

  //#region Subscribe to domain events
  useEffect(() => {
    // Shortcuts issue playback commands on the bus; PlaybackProvider's
    // registered handlers execute them.
    const sub = keyShortcut$.subscribe((shortcut) => {
      if (shortcut === "playpause") wmmBus.invoke("wmm.playback.playpause");
      if (shortcut === "next") wmmBus.invoke("wmm.playback.next");
      if (shortcut === "prev") wmmBus.invoke("wmm.playback.prev");
      if (shortcut === "queue") {
        if (nowPlaying) wmmBus.invoke("wmm.playlists.addSong", { songId: nowPlaying.id });
      }
    });

    return () => sub.unsubscribe();
  }, [nowPlaying]);

  //#endregion

  //#region Helpers
  // Track motion: when transitioning playing→stopped we snap to the real
  // final position once. A ref avoids a sync setState on mount/guidle (the
  // effect lint), and only re-snaps when the engine actually changed state.
  const wasPlayingRef = useRef<boolean>(false);
  const wasPlayingElapsedRef = useRef<boolean>(false);

  useEffect(() => {
    // Playing: tick at ~100 ticks per track (1% per tick). `Song.length` is
    // in SECONDS, so the period in ms is `(length * 1000) / 100` = length*10.
    // Dividing length straight by 100 gives a ~2ms period for a normal track,
    // re-rendering hundreds of times a second and restarting the progress
    // rule's width transition before it advances — the bar looks frozen until
    // pausing.
    if (isPlaying) {
      wasPlayingRef.current = true;
      const tickMs = Math.max(250, (nowPlaying?.length ?? 0) * 10);
      const id = setInterval(() => {
        setTrackPosition(getCurrentTime());
      }, tickMs);
      return () => clearInterval(id);
    }

    // Stopped/paused: if we were previously playing, snap to the real final
    // cursor so the bar/rule is accurate.
    if (wasPlayingRef.current) {
      wasPlayingRef.current = false;
      setTrackPosition(getCurrentTime());
    }
  }, [isPlaying, nowPlaying, getCurrentTime]);

  // Elapsed-time readout: once a second, independent of the bar's tick rate.
  // The paused snap is guarded by a ref so no setState runs synchronously on
  // mount (only on a real playing -> stopped transition).
  useEffect(() => {
    if (isPlaying) {
      wasPlayingElapsedRef.current = true;
      const id = setInterval(() => {
        setElapsedSeconds(getCurrentTime());
      }, 1000);
      return () => clearInterval(id);
    }

    if (wasPlayingElapsedRef.current) {
      wasPlayingElapsedRef.current = false;
      setElapsedSeconds(getCurrentTime());
    }
  }, [isPlaying, nowPlaying, getCurrentTime]);

  //#endregion

  //#region Mute (UI-local: remembers the pre-mute volume for restore)
  const [muted, setMuted] = useState(false);
  const prevVolume = useRef(0.75);

  function handleMuteToggle() {
    if (muted) {
      // Restore the pre-mute volume.
      wmmBus.invoke("wmm.playback.setVolume", { volume: prevVolume.current });
      setMuted(false);
    } else {
      // Remember the current volume, then mute (volume 0).
      prevVolume.current = volume;
      wmmBus.invoke("wmm.playback.setVolume", { volume: 0 });
      setMuted(true);
    }
  }
  //#endregion

  //#region Interactivity handlers
  function handleVolumeChange(v: number | readonly number[]) {
    // Adjusting the slider unmutes (explicit volume gesture).
    setMuted(false);
    wmmBus.invoke("wmm.playback.setVolume", { volume: Number(v) });
  }

  function handlePlayPause() {
    wmmBus.invoke("wmm.playback.playpause");
  }

  function handlePrev() {
    wmmBus.invoke("wmm.playback.prev");
  }

  function handleNext() {
    wmmBus.invoke("wmm.playback.next");
  }

  function handleSeek(v: number | readonly number[]) {
    wmmBus.invoke("wmm.playback.seek", { positionSeconds: Number(v) });
    setTrackPosition(getCurrentTime());
    setElapsedSeconds(getCurrentTime());
  }

  function handleShuffleToggle() {
    wmmBus.invoke("wmm.playback.toggleShuffle");
  }

  function handleRepeatToggle() {
    wmmBus.invoke("wmm.playback.toggleRepeat");
  }

  function handlePlaylistItemClick(song: Song) {
    if (nowPlaying?.id == song.id) {
      wmmBus.invoke("wmm.playback.playpause");
    } else {
      wmmBus.invoke("wmm.playback.playSong", { songId: song.id });
    }
  }

  function handlePlaylistItemRemove(song: Song) {
    wmmBus.invoke("wmm.playback.removeFromQueue", { songId: song.id });
  }
  //#endregion

  // Queue panel, shared by the desktop bar and the mobile mini-player.
  const queuePanel = (
    <PopoverContent align="center" className="w-80 select-none">
      <div className="flex flex-col h-80 gap-2">
        <div className="shrink-0">
          <div className="flex justify-between items-center">
            <div>{`Playlist - ${playlist.length} ${playlist.length == 1 ? "song" : "songs"}`}</div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => wmmBus.invoke("wmm.playback.clearQueue")}
            >
              Clear
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0 min-w-0 overflow-auto">
          <div className="divide-y">
            {playlist.map((s, i) => (
              <div
                data-now-playing={nowPlayingIndex == i ? "true" : "false"}
                key={s.id}
                className={nowPlayingIndex == i ? "bg-accent/15" : ""}
              >
                <Item size="xs">
                  <ItemContent className="overflow-hidden">
                    <ItemTitle className="w-full min-w-0">
                      <span className="truncate">{s.title}</span>
                    </ItemTitle>

                    <ItemDescription className="w-full min-w-0">
                      <span className="truncate">{s.artist}</span>
                    </ItemDescription>
                  </ItemContent>

                  <ItemActions className="gap-0.5">
                    <Button
                      variant="ghost"
                      title="Remove"
                      size="sm"
                      onClick={() => handlePlaylistItemRemove(s)}
                    >
                      <XCircle className="stroke-destructive" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className={
                        nowPlayingIndex == i ? "bg-accent hover:bg-accent/70 text-white" : ""
                      }
                      onClick={() => handlePlaylistItemClick(s)}
                    >
                      {nowPlayingIndex == i && isPlaying && <PauseCircle />}
                      {nowPlayingIndex == i && !isPlaying && <PlayCircle />}
                      {nowPlayingIndex !== i && <PlayCircle />}
                    </Button>
                  </ItemActions>
                </Item>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </PopoverContent>
  );

  const meta = [nowPlaying?.artist, nowPlaying?.album].filter(Boolean).join(" — ");
  const progress =
    nowPlaying?.length && nowPlaying.length > 0
      ? Math.min(100, (trackPosition / nowPlaying.length) * 100)
      : 0;

  if (isCompact) {
    return (
      <div className="relative flex shrink-0 items-center gap-2 px-2 py-2 border bg-secondary supports-backdrop-filter:bg-secondary/60 supports-backdrop-filter:backdrop-blur-lg select-none">
        {/* Slim progress rule along the top edge, like the mini-player. */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted overflow-hidden">
          <div
            className="h-full bg-accent transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Art + title / artist — album: the same fields a track row shows,
            truncated the same way. It's display-only — the play button owns
            playback. */}
        <div className="flex min-w-0 flex-1 items-center gap-3 px-1">
          <AlbumArtImage
            songId={nowPlaying?.id}
            thumbSize={ThumbnailSize.thumb128}
            className="w-12 shrink-0 rounded-md"
            fallback={
              <div className="w-10 aspect-square rounded-md border flex items-center justify-center">
                <Disc3 className="text-accent" />
              </div>
            }
          />
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="min-w-0 truncate text-sm font-medium">
              {nowPlaying?.title ?? "Nothing is playing"}
            </div>
            <div className="min-w-0 truncate text-xs text-muted-foreground">{meta || " "}</div>
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <Button
            size="icon"
            variant="ghost"
            className="h-14 w-14 rounded-full bg-secondary-foreground/10 hover:bg-secondary-foreground/20"
            onClick={handlePlayPause}
            disabled={!nowPlaying}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-7 w-7 fill-secondary-foreground" />
            ) : (
              <Play className="h-7 w-7 fill-secondary-foreground" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 p-4 border-t bg-secondary/50 select-none">
      <div className="w-full flex items-center justify-between">
        <div className="w-60 flex items-center gap-3">
          <AlbumArtImage
            songId={nowPlaying?.id}
            thumbSize={ThumbnailSize.thumb64}
            className="w-12"
            fallback={
              <div className="w-12 aspect-square rounded-md border flex items-center justify-center">
                <Disc3 className="text-accent" />
              </div>
            }
          />

          <div className="flex flex-col overflow-hidden">
            <span className="font-medium truncate">
              {nowPlaying?.title ?? "Nothing is playing"}
            </span>
            <span className="text-sm text-muted-foreground truncate">
              {nowPlaying?.artist ?? ""}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Button size="lg" variant="ghost" title={shuffle} onClick={handleShuffleToggle}>
              <Shuffle
                className={shuffle === shuffleState.On ? "stroke-accent" : "stroke-foreground"}
              />
            </Button>

            <Button size="lg" variant="ghost" onClick={handlePrev} disabled={!nowPlaying}>
              <SkipBack className="fill-secondary-foreground" />
            </Button>

            <Button
              size="lg"
              variant="default"
              className="rounded-full bg-accent border-accent/25 hover:bg-accent/75 text-white"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="fill-secondary-foreground" />
              ) : (
                <Play className="fill-secondary-foreground" />
              )}
            </Button>

            <Button size="lg" variant="ghost" onClick={handleNext} disabled={!nowPlaying}>
              <SkipForward className="fill-secondary-foreground" />
            </Button>

            <Button size="lg" variant="ghost" onClick={handleRepeatToggle} title={repeat}>
              {repeat === repeatState.Off && <RepeatOff />}
              {repeat === repeatState.One && <Repeat1 className="stroke-accent" />}
              {repeat === repeatState.All && <Repeat2 className="stroke-accent" />}
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full max-w-lg">
            <span className="text-xs w-10 text-right">
              {elapsedSeconds > 0 ? formatLength(elapsedSeconds) : "--:--"}
            </span>

            <Slider
              defaultValue={[0]}
              min={0}
              max={100}
              step={1}
              value={
                nowPlaying && nowPlaying.length != null && nowPlaying.length > 0
                  ? (trackPosition / nowPlaying.length) * 100
                  : 0
              }
              onValueChange={handleSeek}
              className="flex-1"
            />

            <span className="text-xs w-10">
              {nowPlaying?.length ? formatLength(nowPlaying.length) : "--:--"}
            </span>
          </div>
        </div>

        <div className="w-60 flex items-center justify-end gap-3">
          <Popover open={isPlaylistOpen} onOpenChange={setIsPlaylistOpen}>
            <PopoverTrigger
              disabled={playlist.length === 0}
              render={
                <Button
                  variant="ghost"
                  title="Playlist"
                  className="w-6"
                  disabled={playlist.length === 0}
                >
                  <ListMusic className="fill-secondary-foreground" />
                </Button>
              }
            />
            {queuePanel}
          </Popover>

          <Button variant="ghost" onClick={handleMuteToggle} title={muted ? "Unmute" : "Mute"}>
            {muted ? (
              <VolumeX className="fill-secondary-foreground w-6" />
            ) : (
              <Volume2 className="fill-secondary-foreground w-6" />
            )}
          </Button>

          <Slider
            min={0}
            max={1}
            step={0.01}
            defaultValue={[0.75]}
            value={[volume]}
            onValueChange={handleVolumeChange}
          />
        </div>
      </div>
    </div>
  );
}
