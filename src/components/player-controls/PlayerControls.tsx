import { ExplicitBadge } from "@/components/explicit-badge";
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
  ChevronDown,
  Maximize2,
  ListMusic,
  PauseCircle,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThumbnailSize } from "@/lib";
import { Slider } from "@/components/ui/slider";
import { repeatState, shuffleState, usePlayback } from "@/hooks/usePlayback";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Song } from "@/models";
import { AlbumArtImage } from "@/components/album-art-image";
import { keyShortcut$ } from "@/events/keyboard-events";
import { wmmBus } from "@/events";
import { FavoriteButton } from "@/components/favorite-button";
import { useIsCompact } from "@/lib/hooks/useIsMobile";
import { formatLength } from "@/lib/formatLength";
import { cn } from "cn";
import { NowPlayingView } from "./NowPlayingView";

function PlayPauseCutout({ isPlaying }: { isPlaying: boolean }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
      <defs>
        <mask id={id}>
          <rect width="64" height="64" fill="white" />
          <g transform="translate(16 16) scale(1.333)" fill="black">
            {isPlaying ? (
              <>
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </>
            ) : (
              <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
            )}
          </g>
        </mask>
      </defs>
      <circle cx="32" cy="32" r="32" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}

export function PlayerControls() {
  //#region State
  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const [controlsHidden, setControlsHidden] = useState<boolean>(false);
  const compactBarRef = useRef<HTMLDivElement | null>(null);
  const [compactBarHeight, setCompactBarHeight] = useState<number>(0);
  const [trackPosition, setTrackPosition] = useState<number>(0);
  // Elapsed-time readout ticks once a second; the progress bar keeps its own
  // (faster) rate from trackPosition.
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  // Which track the readout belongs to (see the reset below).
  const [elapsedSongId, setElapsedSongId] = useState<string | undefined>(
    undefined
  );
  // Mobile renders a compact mini-player (now-playing info + one large play
  // button) instead of the wide three-column bar, whose controls are too
  // small to reach with a thumb.
  const isCompact = useIsCompact();
  const [scrubPct, setScrubPct] = useState<number | null>(null);
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
        if (nowPlaying)
          wmmBus.invoke("wmm.playlists.addSong", { songId: nowPlaying.id });
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
      const tickMs = Math.max(250, (nowPlaying?.duration ?? 0) * 10);
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
                      <ExplicitBadge song={s} />
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
                        nowPlayingIndex == i
                          ? "bg-accent hover:bg-accent/70 text-white"
                          : ""
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

  useEffect(() => {
    if (!isNowPlayingOpen) {
      setIsIdle(false);
      setControlsHidden(false);
      return;
    }
    if (isCompact) return;
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIsIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIsIdle(true), 3000);
    };
    wake();
    const events = ["mousemove", "pointerdown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, wake));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, [isNowPlayingOpen, isCompact]);

  useEffect(() => {
    if (!isNowPlayingOpen && compactBarRef.current) {
      setCompactBarHeight(compactBarRef.current.offsetHeight);
    }
  });

  const overlayClass = isNowPlayingOpen
    ? cn(
        "relative z-110 transition-opacity duration-300",
        isIdle && "pointer-events-none opacity-0"
      )
    : "";

  const meta = [nowPlaying?.artist, nowPlaying?.album]
    .filter(Boolean)
    .join(" — ");
  const progress =
    nowPlaying?.duration && nowPlaying.duration > 0
      ? Math.min(100, (trackPosition / nowPlaying.duration) * 100)
      : 0;

  function pctFromPointer(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.min(
      100,
      Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)
    );
  }

  const scrubSeconds =
    scrubPct !== null && nowPlaying?.duration
      ? (scrubPct / 100) * nowPlaying.duration
      : null;

  if (isCompact) {
    const compactBar = (
      <div
        ref={compactBarRef}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, [role='slider']")) {
            return;
          }
          setIsNowPlayingOpen(true);
        }}
        className={cn(
          "relative flex shrink-0 cursor-pointer flex-col rounded-xl border bg-secondary supports-backdrop-filter:bg-secondary/60 supports-backdrop-filter:backdrop-blur-lg select-none",
          overlayClass
        )}
      >
        {/* Slim progress rule along the top edge, like the mini-player. */}
        <div className="absolute top-0 inset-x-3 h-0.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-accent transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        {nowPlaying?.duration ? (
          <div
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(scrubPct ?? progress)}
            className="absolute inset-x-0 top-0 z-10 h-6 touch-none cursor-default"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setScrubPct(pctFromPointer(e));
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                setScrubPct(pctFromPointer(e));
              }
            }}
            onPointerUp={(e) => {
              if (scrubPct !== null) handleSeek(scrubPct);
              setScrubPct(null);
              e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={() => setScrubPct(null)}
          >
            {scrubPct !== null && (
              <>
                <div className="absolute inset-x-0 top-0 h-1.5 bg-muted">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${scrubPct}%` }}
                  />
                </div>
                <div
                  className="absolute top-0 size-4 -translate-x-1/2 -translate-y-1/4 rounded-full bg-white shadow"
                  style={{ left: `${scrubPct}%` }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-full mb-4 -translate-x-1/2 rounded-xl bg-accent px-3 py-1.5 text-xl font-bold tabular-nums text-accent-foreground shadow-lg"
                  style={{
                    left: `clamp(2.25rem, ${scrubPct}%, calc(100% - 2.25rem))`,
                  }}
                >
                  {formatLength(scrubSeconds ?? 0)}
                </div>
              </>
            )}
          </div>
        ) : null}

        <div className="flex items-center gap-2 px-2 py-2">
          {/* Art + title / artist — album: the same fields a track row shows,
            truncated the same way. It's display-only — the play button owns
            playback. */}
          <div className="flex min-w-0 flex-1 items-center gap-3 px-1">
            <button
              type="button"
              aria-label="Open now playing"
              title="Now playing"
              className="shrink-0 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => setIsNowPlayingOpen(true)}
            >
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
            </button>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                <span className="min-w-0 truncate">
                  {nowPlaying?.title ?? "Nothing is playing"}
                </span>
                <ExplicitBadge song={nowPlaying} />
              </div>
              <div className="min-w-0 truncate text-xs text-muted-foreground">
                {meta || " "}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {nowPlaying && (
              <FavoriteButton
                songId={nowPlaying.id}
                className="h-10 w-10"
                iconSize={20}
              />
            )}
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
      </div>
    );

    return (
      <>
        {isNowPlayingOpen ? (
          <>
            <div style={{ height: compactBarHeight }} />
            {createPortal(
              <div className="pointer-events-none fixed inset-x-0 bottom-0 z-110 mx-auto max-w-3xl px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
                <div className="pointer-events-auto flex flex-col select-none">
                  {nowPlaying?.duration ? (
                    <div className="flex items-center gap-3 px-6 pt-2">
                      <span
                        className={cn(
                          "w-10 text-right text-xs tabular-nums text-white/80 transition-opacity duration-300",
                          controlsHidden && "opacity-0"
                        )}
                      >
                        {formatLength(scrubSeconds ?? elapsedSeconds)}
                      </span>
                      <div
                        role="slider"
                        aria-label="Seek"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(scrubPct ?? progress)}
                        className={cn(
                          "relative flex flex-1 touch-none items-center transition-[height] duration-300",
                          controlsHidden ? "h-5" : "h-8"
                        )}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setScrubPct(pctFromPointer(e));
                        }}
                        onPointerMove={(e) => {
                          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                            setScrubPct(pctFromPointer(e));
                          }
                        }}
                        onPointerUp={(e) => {
                          if (scrubPct !== null) handleSeek(scrubPct);
                          setScrubPct(null);
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        }}
                        onPointerCancel={() => setScrubPct(null)}
                      >
                        <div
                          className={cn(
                            "w-full overflow-hidden rounded-full bg-white/25 transition-[height] duration-300",
                            controlsHidden ? "h-0.5" : "h-1.5"
                          )}
                        >
                          <div
                            className="h-full bg-white"
                            style={{ width: `${scrubPct ?? progress}%` }}
                          />
                        </div>
                        <div
                          className={cn(
                            "absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-opacity duration-300",
                            controlsHidden && scrubPct === null && "opacity-0"
                          )}
                          style={{ left: `${scrubPct ?? progress}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "w-10 text-xs tabular-nums text-white/80 transition-opacity duration-300",
                          controlsHidden && "opacity-0"
                        )}
                      >
                        {formatLength(nowPlaying.duration)}
                      </span>
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "flex items-center justify-between gap-1 px-4 py-2 transition-opacity duration-300 sm:justify-center sm:gap-4",
                      controlsHidden && "pointer-events-none opacity-0"
                    )}
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-12 rounded-full"
                      onClick={handleShuffleToggle}
                      title="Shuffle"
                      aria-label="Shuffle"
                      aria-pressed={shuffle === shuffleState.On}
                    >
                      <Shuffle
                        className={cn(
                          "size-6",
                          shuffle === shuffleState.On
                            ? "stroke-accent"
                            : "stroke-foreground"
                        )}
                      />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-14 rounded-full"
                      onClick={handlePrev}
                      disabled={!nowPlaying}
                      aria-label="Previous"
                    >
                      <SkipBack className="size-7 fill-foreground" />
                    </Button>
                    <button
                      type="button"
                      className="size-16 shrink-0 rounded-full transition-transform active:scale-95 disabled:opacity-50"
                      onClick={handlePlayPause}
                      disabled={!nowPlaying}
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      <PlayPauseCutout isPlaying={isPlaying} />
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-14 rounded-full"
                      onClick={handleNext}
                      disabled={!nowPlaying}
                      aria-label="Next"
                    >
                      <SkipForward className="size-7 fill-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-12 rounded-full"
                      onClick={handleRepeatToggle}
                      title={repeat}
                      aria-label={`Repeat: ${repeat}`}
                    >
                      {repeat === repeatState.Off && (
                        <RepeatOff className="size-6" />
                      )}
                      {repeat === repeatState.One && (
                        <Repeat1 className="size-6 stroke-accent" />
                      )}
                      {repeat === repeatState.All && (
                        <Repeat2 className="size-6 stroke-accent" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </>
        ) : (
          compactBar
        )}

        <NowPlayingView
          open={isNowPlayingOpen}
          onClose={() => setIsNowPlayingOpen(false)}
          onBackgroundClick={() => setControlsHidden((hidden) => !hidden)}
        />
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex shrink-0 border-t p-4 select-none",
          isNowPlayingOpen ? "bg-transparent" : "bg-secondary/50",
          overlayClass
        )}
      >
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex w-60 items-center gap-3">
            {isNowPlayingOpen ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Close now playing"
                title="Close now playing"
                className="size-12 shrink-0"
                onClick={() => setIsNowPlayingOpen(false)}
              >
                <ChevronDown className="size-7" />
              </Button>
            ) : (
              <button
                type="button"
                aria-label="Open now playing"
                title="Now playing"
                className="group/art relative shrink-0 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={() => setIsNowPlayingOpen(true)}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/55 text-white opacity-0 transition-opacity group-hover/art:opacity-100 group-focus-visible/art:opacity-100"
                >
                  <Maximize2 className="size-5" />
                </span>
                <AlbumArtImage
                  songId={nowPlaying?.id}
                  thumbSize={ThumbnailSize.thumb64}
                  className="w-12 rounded-md"
                  fallback={
                    <div className="flex aspect-square w-12 items-center justify-center rounded-md border">
                      <Disc3 className="text-accent" />
                    </div>
                  }
                />
              </button>
            )}

            <div
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3",
                isNowPlayingOpen && "invisible"
              )}
            >
              <div className="flex min-w-0 flex-col overflow-hidden">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="truncate">
                    {nowPlaying?.title ?? "Nothing is playing"}
                  </span>
                  <ExplicitBadge song={nowPlaying} />
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {nowPlaying?.artist ?? ""}
                </span>
              </div>
              {nowPlaying && (
                <FavoriteButton songId={nowPlaying.id} iconSize={16} />
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center">
            <div className="mb-2 flex items-center gap-2">
              <Button
                size="lg"
                variant="ghost"
                title={shuffle}
                onClick={handleShuffleToggle}
              >
                <Shuffle
                  className={
                    shuffle === shuffleState.On
                      ? "stroke-accent"
                      : "stroke-foreground"
                  }
                />
              </Button>

              <Button
                size="lg"
                variant="ghost"
                onClick={handlePrev}
                disabled={!nowPlaying}
              >
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

              <Button
                size="lg"
                variant="ghost"
                onClick={handleNext}
                disabled={!nowPlaying}
              >
                <SkipForward className="fill-secondary-foreground" />
              </Button>

              <Button
                size="lg"
                variant="ghost"
                onClick={handleRepeatToggle}
                title={repeat}
              >
                {repeat === repeatState.Off && <RepeatOff />}
                {repeat === repeatState.One && (
                  <Repeat1 className="stroke-accent" />
                )}
                {repeat === repeatState.All && (
                  <Repeat2 className="stroke-accent" />
                )}
              </Button>
            </div>

            <div className="flex w-full max-w-lg items-center gap-3">
              <span className="w-10 text-right text-xs">
                {elapsedSeconds > 0 ? formatLength(elapsedSeconds) : "--:--"}
              </span>

              <Slider
                defaultValue={[0]}
                min={0}
                max={100}
                step={1}
                value={
                  nowPlaying &&
                  nowPlaying.duration != null &&
                  nowPlaying.duration > 0
                    ? (trackPosition / nowPlaying.duration) * 100
                    : 0
                }
                onValueChange={handleSeek}
                className="flex-1"
              />

              <span className="w-10 text-xs">
                {nowPlaying?.duration
                  ? formatLength(nowPlaying.duration)
                  : "--:--"}
              </span>
            </div>
          </div>

          <div className="flex w-60 items-center justify-end gap-3">
            <Popover open={isPlaylistOpen} onOpenChange={setIsPlaylistOpen}>
              <PopoverTrigger
                disabled={playlist.length === 0}
                render={
                  <Button
                    variant="ghost"
                    title="Playlist"
                    className={cn("w-6", isNowPlayingOpen && "invisible")}
                    disabled={playlist.length === 0}
                  >
                    <ListMusic className="fill-secondary-foreground" />
                  </Button>
                }
              />
              {queuePanel}
            </Popover>

            <Button
              variant="ghost"
              onClick={handleMuteToggle}
              title={muted ? "Unmute" : "Mute"}
            >
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

      <NowPlayingView
        open={isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
      />
    </>
  );
}
