import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import {
  Activity,
  ChevronDown,
  Maximize,
  Minimize,
  Moon,
  ListMusic,
  Disc3,
  MicVocal,
  Pause,
  Play,
  SlidersHorizontal,
  Volume2,
} from "lucide-react";
import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { useIsCompact } from "@/lib/hooks/useIsMobile";
import { AlbumArtImage } from "@/components/album-art-image";
import { ThumbnailSize } from "@/lib";
import { useArtwork } from "@/hooks/useArtwork";
import { ArtworkType } from "@/lib/contracts";
import { ExplicitBadge } from "@/components/explicit-badge";
import { FavoriteButton } from "@/components/favorite-button";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatLength } from "@/lib/formatLength";
import { usePlayback } from "@/hooks/usePlayback";
import {
  VisualizationHost,
  VisualizerSelector,
  VisualizerSettings,
} from "@/components/visualizer";
import { useVisualizer } from "@/hooks";
import { setVisualizerPalette } from "@/lib/visualizers";
import { NowPlayingBackdrop } from "./NowPlayingBackdrop";
import { useArtworkPalette } from "./useArtworkPalette";
import { wmmBus } from "@/events";
import { keyShortcut$ } from "@/events/keyboard-events";
import type { Song } from "@/models";
import { getStore } from "@/core/system";
import { repeatState } from "@/hooks/usePlayback";

function NowPlayingArt({ songId }: { songId: string | undefined }) {
  const picture = useArtwork(songId ?? "", ArtworkType.FrontCover);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!picture?.data) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(new Blob([picture.data.slice()]));
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [picture]);

  if (!songId || !url) {
    return (
      <div className="absolute inset-0 flex items-center justify-center rounded-xl border">
        <Disc3 className="size-12 text-accent" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      draggable={false}
      className="absolute inset-0 size-full rounded-xl object-cover shadow-2xl"
    />
  );
}

function FitText({
  children,
  maxPx,
  minPx,
  className,
}: {
  children: string;
  maxPx: number;
  minPx: number;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    const fit = () => {
      let size = maxPx;
      text.style.fontSize = `${size}px`;
      while (size > minPx && text.scrollWidth > box.clientWidth) {
        size -= 1;
        text.style.fontSize = `${size}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [children, maxPx, minPx]);

  return (
    <div
      ref={boxRef}
      className={cn(
        "min-w-0 max-w-full overflow-hidden text-center",
        className
      )}
    >
      <span ref={textRef} className="inline-block whitespace-nowrap">
        {children}
      </span>
    </div>
  );
}

type PanelTab = "queue" | "lyrics" | "visualizer";

interface NowPlayingViewProps {
  open: boolean;
  onClose: () => void;
  onBackgroundClick?: () => void;
  /** Fade out the top toolbar together with the player bar. */
  controlsHidden?: boolean;
}

/**
 * Full-page now-playing view: the current track's art and details on the left,
 * the play queue on the right. Opened from the album art in the player bar.
 */
export function NowPlayingView({
  open,
  onClose,
  onBackgroundClick,
  controlsHidden = false,
}: NowPlayingViewProps) {
  const {
    playlist,
    nowPlaying,
    nowPlayingIndex,
    isPlaying,
    repeat,
    shuffle,
    getCollectionIds,
  } = usePlayback();

  const [panel, setPanel] = useState<PanelTab | null>(null);
  const [darkRoom, setDarkRoom] = useState<boolean>(false);
  const { setSettingsOpen, settingsOpen } = useVisualizer();
  const palette = useArtworkPalette(nowPlaying?.id, open);
  const [upNext, setUpNext] = useState<Song | undefined>();

  // Share the backdrop's palette with visualizer plugins so they paint in the
  // same colors as the rest of the screen.
  useEffect(() => {
    setVisualizerPalette(palette);
    return () => setVisualizerPalette(null);
  }, [palette]);

  const hasUpcoming =
    playlist.length > 0 &&
    (repeat === repeatState.All ||
      (nowPlayingIndex ?? -1) < playlist.length - 1);
  const collectionNextId = (() => {
    if (!open || playlist.length > 0 || !nowPlaying || shuffle === "On") {
      return undefined;
    }
    const coll = getCollectionIds();
    const idx = coll.indexOf(nowPlaying.id);
    if (idx === -1) return undefined;
    if (idx + 1 < coll.length) return coll[idx + 1];
    return repeat === repeatState.All ? coll[0] : undefined;
  })();

  useEffect(() => {
    if (!collectionNextId) {
      setUpNext(undefined);
      return;
    }
    let cancelled = false;
    void getStore()
      .get(collectionNextId)
      .then((song) => {
        if (!cancelled) setUpNext(song ?? undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [collectionNextId]);

  const showQueuePanel = panel === "queue" && hasUpcoming;
  const showUpNext = panel === "queue" && !hasUpcoming && !!upNext;
  const queueIsOneAlbum =
    playlist.length > 0 &&
    playlist.every(
      (song) =>
        !!song.album &&
        song.album === playlist[0].album &&
        (song.albumArtist ?? song.artist) ===
          (playlist[0].albumArtist ?? playlist[0].artist)
    );
  const isCompact = useIsCompact();
  const canFullscreen =
    !isCompact && typeof document !== "undefined" && document.fullscreenEnabled;
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement !== null);
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (!open && document.fullscreenElement) {
      void document.exitFullscreen();
    }
  }, [open]);

  // "f" toggles fullscreen while the playback view is open. The global key
  // handler already skips text fields, so this only needs to ignore the view
  // being closed, compact layouts and the settings dialog.
  useEffect(() => {
    if (!open) {
      return;
    }

    const sub = keyShortcut$.subscribe((shortcut) => {
      if (shortcut === "fullscreen" && canFullscreen && !settingsOpen) {
        toggleFullscreen();
      }
    });

    return () => sub.unsubscribe();
  }, [open, canFullscreen, settingsOpen]);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }

  const lyricsOpen = panel === "lyrics";
  const hasPanel = showQueuePanel || showUpNext || panel === "lyrics";

  function togglePanel(tab: PanelTab) {
    setPanel(panel === tab ? null : tab);
  }

  const tabs: { id: PanelTab; label: string; icon: typeof ListMusic }[] = [
    { id: "queue", label: "Queue", icon: ListMusic },
    { id: "lyrics", label: "Lyrics", icon: MicVocal },
    { id: "visualizer", label: "Visualizer", icon: Activity },
  ];

  function playQueueItem(song: Song) {
    if (nowPlaying?.id === song.id) {
      wmmBus.invoke("wmm.playback.playpause");
    } else {
      wmmBus.invoke("wmm.playback.playSong", { songId: song.id });
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="now-playing"
          className={cn(
            "fixed inset-0 z-100 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[calc(env(safe-area-inset-bottom)+9rem)] md:pb-28 pl-[env(safe-area-inset-left)] transition-colors duration-300",
            darkRoom ? "bg-black" : "bg-background",
            controlsHidden && "cursor-none"
          )}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          onClick={(e) => {
            if (
              (e.target as HTMLElement).closest(
                "button, a, li, [role='slider'], [data-no-bg-click]"
              )
            ) {
              return;
            }
            onBackgroundClick?.();
          }}
        >
          {!darkRoom && (
            <NowPlayingBackdrop
              palette={palette}
              seed={`${nowPlaying?.album ?? ""}|${nowPlaying?.artist ?? ""}`}
            />
          )}
          {panel === "visualizer" && (
            <VisualizationHost
              className="absolute inset-0 z-0 rounded-none"
              showFullscreenControl={false}
            />
          )}
          {panel === "visualizer" && <VisualizerSettings />}

          <div
            className={cn(
              "relative z-10 flex shrink-0 items-center justify-between px-4 py-3 select-none transition-opacity duration-300",
              controlsHidden && "pointer-events-none opacity-0"
            )}
          >
            <div className="flex items-center gap-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  size="icon"
                  variant="ghost"
                  className={cn(
                    panel === id &&
                      "bg-accent/20 text-white hover:bg-accent/30 hover:text-white dark:bg-accent/25 dark:hover:bg-accent/35 dark:hover:text-white"
                  )}
                  title={panel === id ? `Hide ${label}` : label}
                  aria-label={label}
                  aria-pressed={panel === id}
                  onClick={() => togglePanel(id)}
                >
                  <Icon />
                </Button>
              ))}
              {panel === "visualizer" && (
                <>
                  <VisualizerSelector
                    variant="compact"
                    className="ml-1 w-44"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Visualizer settings"
                    aria-label="Visualizer settings"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <SlidersHorizontal />
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {panel !== "visualizer" && (
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    darkRoom &&
                      "bg-accent/20 text-white hover:bg-accent/30 hover:text-white dark:bg-accent/25 dark:hover:bg-accent/35 dark:hover:text-white"
                  )}
                  title={darkRoom ? "Turn on the lights" : "Dark room"}
                  aria-label="Dark room"
                  aria-pressed={darkRoom}
                  onClick={() => setDarkRoom(!darkRoom)}
                >
                  <Moon />
                </Button>
              )}
              {canFullscreen && (
                <Button
                  size="icon"
                  variant="ghost"
                  title={isFullscreen ? "Exit full screen" : "Full screen"}
                  aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize /> : <Maximize />}
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                aria-label="Close now playing"
                onClick={onClose}
              >
                <ChevronDown />
              </Button>
            </div>
          </div>

          {panel === "visualizer" && nowPlaying && (
            <div className="pointer-events-none relative z-10 mt-auto px-6 pb-4 select-none">
              <div className="max-w-md min-w-0 drop-shadow-md">
                <p className="truncate text-sm font-semibold text-white">
                  {nowPlaying.title}
                </p>
                <p className="truncate text-xs text-white/70">
                  {[nowPlaying.artist, nowPlaying.album]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
          )}

          {panel !== "visualizer" && (
            <div className="relative min-h-0 flex-1 overflow-y-auto md:overflow-hidden md:px-8 md:pb-4 md:@container-size">
              <div
                className={cn(
                  "flex min-h-full flex-col items-center gap-6 px-4 pb-6 md:h-full md:flex-row md:items-center md:justify-center md:gap-8 md:p-0",
                  lyricsOpen ? "justify-start pt-2" : "justify-center",
                  hasPanel
                    ? "md:[--art:min(calc(100cqh-7.5rem),calc((100cqw-2rem)/2))]"
                    : "md:[--art:min(calc(100cqh-7.5rem),100cqw)]"
                )}
              >
                <div
                  className={cn(
                    "flex w-full gap-4 md:w-(--art) md:flex-col md:items-center",
                    lyricsOpen
                      ? "flex-row items-center"
                      : "flex-col items-center"
                  )}
                >
                  <div
                    className={cn(
                      "relative aspect-square transition-opacity duration-300 md:size-(--art)",
                      darkRoom && "invisible opacity-0",
                      lyricsOpen
                        ? "size-24 shrink-0"
                        : "w-[min(100%,28rem,calc(100dvh-24rem))]"
                    )}
                  >
                    <NowPlayingArt songId={nowPlaying?.id} />
                  </div>

                  <div
                    className={cn(
                      "flex shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl py-2 text-center backdrop-blur-md transition-opacity duration-300 md:h-26 md:w-full md:max-w-none md:px-4",
                      darkRoom && "opacity-30",
                      lyricsOpen
                        ? "min-w-0 flex-1 px-2"
                        : "w-full max-w-md px-4"
                    )}
                  >
                    <div className="grid w-full min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-1">
                      <div className="flex justify-end">
                        <ExplicitBadge song={nowPlaying} />
                      </div>
                      <FitText
                        maxPx={24}
                        minPx={12}
                        className="font-semibold text-white"
                      >
                        {nowPlaying?.title ?? "Nothing is playing"}
                      </FitText>
                      <div className="flex justify-start">
                        {nowPlaying && (
                          <FavoriteButton
                            songId={nowPlaying.id}
                            iconSize={22}
                          />
                        )}
                      </div>
                    </div>
                    <FitText
                      maxPx={14}
                      minPx={10}
                      className="w-full font-medium text-[color-mix(in_oklab,var(--accent)_30%,white)]"
                    >
                      {nowPlaying?.artist ?? ""}
                    </FitText>
                    <FitText
                      maxPx={14}
                      minPx={10}
                      className="w-full font-medium text-[color-mix(in_oklab,var(--accent)_30%,white)]"
                    >
                      {nowPlaying?.album ?? ""}
                    </FitText>
                  </div>
                </div>

                {showQueuePanel && (
                  <div className="flex min-h-0 w-full flex-col rounded-xl bg-black/45 p-3 text-white backdrop-blur-md md:bg-transparent md:h-full md:w-(--art) md:flex-none">
                    <div className="flex shrink-0 items-center justify-between pb-2">
                      <span className="text-sm font-medium">
                        {`Queue — ${playlist.length} ${playlist.length === 1 ? "song" : "songs"}`}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={playlist.length === 0}
                        onClick={() => wmmBus.invoke("wmm.playback.clearQueue")}
                      >
                        Clear
                      </Button>
                    </div>

                    <ScrollArea className="min-h-0 flex-1">
                      <ol className="text-sm">
                        {playlist.map((song, index) => (
                          <li key={song.id}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left active:bg-white/10 hover:bg-white/5"
                              onClick={() => playQueueItem(song)}
                            >
                              {queueIsOneAlbum ? (
                                <span className="flex w-5 shrink-0 justify-end tabular-nums text-white/75">
                                  {nowPlayingIndex === index ? (
                                    isPlaying ? (
                                      <Pause className="size-3.5 text-white" />
                                    ) : (
                                      <Play className="size-3.5 text-white" />
                                    )
                                  ) : (
                                    (song.track ?? index + 1)
                                  )}
                                </span>
                              ) : (
                                <span className="relative size-10 shrink-0">
                                  <AlbumArtImage
                                    songId={song.id}
                                    thumbSize={ThumbnailSize.thumb64}
                                    className="size-10 rounded-md"
                                    fallback={
                                      <div className="flex size-10 items-center justify-center rounded-md border">
                                        <Disc3 className="size-4 text-accent" />
                                      </div>
                                    }
                                  />
                                  {nowPlayingIndex === index && (
                                    <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/55">
                                      {isPlaying ? (
                                        <Pause className="size-4 text-white" />
                                      ) : (
                                        <Play className="size-4 text-white" />
                                      )}
                                    </span>
                                  )}
                                </span>
                              )}
                              <span className="min-w-0 flex-1">
                                <span
                                  className={
                                    nowPlayingIndex === index
                                      ? "flex min-w-0 items-center gap-1.5 truncate font-semibold text-white underline decoration-white/60 underline-offset-4"
                                      : "flex min-w-0 items-center gap-1.5 truncate"
                                  }
                                >
                                  <span className="truncate">{song.title}</span>
                                  <ExplicitBadge song={song} />
                                </span>
                                <span className="flex min-w-0 items-center gap-1 truncate text-xs text-white/75">
                                  <Volume2 className="size-3 shrink-0" />
                                  <span className="truncate">
                                    {song.artist}
                                  </span>
                                </span>
                              </span>
                              <span className="shrink-0 tabular-nums text-white/75">
                                {formatLength(song.duration)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ol>
                    </ScrollArea>
                  </div>
                )}

                {panel === "lyrics" && (
                  <div className="flex min-h-48 w-full min-w-0 flex-1 flex-col rounded-xl bg-black/45 p-3 text-white backdrop-blur-md md:bg-transparent md:h-full md:w-(--art) md:flex-none">
                    {nowPlaying?.lyrics?.trim() ? (
                      <ScrollArea className="min-h-0 flex-1">
                        <p className="whitespace-pre-wrap pr-3 text-base leading-relaxed text-white/90">
                          {nowPlaying.lyrics}
                        </p>
                      </ScrollArea>
                    ) : (
                      <p className="m-auto text-sm text-white/75">
                        No lyrics for this song.
                      </p>
                    )}
                  </div>
                )}

                {showUpNext && upNext && (
                  <div className="flex min-h-0 w-full flex-col justify-center rounded-xl bg-black/45 p-3 text-white backdrop-blur-md md:bg-transparent md:h-full md:w-(--art) md:flex-none">
                    <span className="pb-2 text-sm font-medium">Up next</span>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left active:bg-white/10 hover:bg-white/5"
                      onClick={() => playQueueItem(upNext)}
                    >
                      <AlbumArtImage
                        songId={upNext.id}
                        thumbSize={ThumbnailSize.thumb128}
                        className="w-12 shrink-0 rounded-md"
                        fallback={
                          <div className="flex aspect-square w-12 items-center justify-center rounded-md border">
                            <Disc3 className="text-accent" />
                          </div>
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                          <span className="truncate">{upNext.title}</span>
                          <ExplicitBadge song={upNext} />
                        </span>
                        <span className="block truncate text-xs text-white/75">
                          {upNext.artist}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-white/75">
                        {formatLength(upNext.duration)}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
