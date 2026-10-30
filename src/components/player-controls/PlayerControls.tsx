import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
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
import { useEffect, useState } from "react";
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
import { keyShortcut$ } from "@/core/events/keyboard-events";
import { wmmBus } from "@/core/events";

function PlayerControls() {
  //#region State
  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(false);
  const [trackPosition, setTrackPosition] = useState<number>(0);
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
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const id = setInterval(
      () => {
        setTrackPosition(getCurrentTime());
      },
      (nowPlaying?.length ?? 0) / 100
    );

    return () => {
      clearInterval(id);
    };
  }, [isPlaying, nowPlaying, getCurrentTime]);

  function formatTime(time: number) {
    if (time === 0) {
      return '--:--'
    }
    const d = time;
    const m = Math.floor(d / 60);
    const s = `${Math.floor(d % 60)}`.padStart(2, "0");
    return `${m}:${s}`;
  }
  //#endregion

  //#region Interactivity handlers
  function handleVolumeChange(v: number | readonly number[]) {
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

          <div className="flex items-center gap-3 w-full max-w-lg">
            <span className="text-xs w-10 text-right">
              {formatTime(trackPosition)}
            </span>

            <Slider
              defaultValue={[0]}
              min={0}
              max={100}
              step={1}
              value={(trackPosition / (nowPlaying?.length ?? 0)) * 100}
              onValueChange={handleSeek}
              className="flex-1"
            />

            <span className="text-xs w-10">
              {formatTime(nowPlaying?.length ?? 0)}
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
            <PopoverContent align="center" className="w-80 select-none">
              <div className="flex flex-col h-80 gap-2">
                <div className="shrink-0">
                  <div className="flex justify-between items-center">
                    <div>
                      {`Playlist - ${playlist.length} ${playlist.length == 1 ? "song" : "songs"}`}
                    </div>
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
                        data-now-playing={
                          nowPlayingIndex == i ? "true" : "false"
                        }
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
                                nowPlayingIndex == i
                                  ? "bg-accent hover:bg-accent/70 text-white"
                                  : ""
                              }
                              onClick={() => handlePlaylistItemClick(s)}
                            >
                              {nowPlayingIndex == i && isPlaying && (
                                <PauseCircle />
                              )}
                              {nowPlayingIndex == i && !isPlaying && (
                                <PlayCircle />
                              )}
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
          </Popover>

          <Button variant="ghost" onClick={() => wmmBus.invoke("wmm.playback.setVolume", { volume: 0 })}>
            <Volume2 className="fill-secondary-foreground w-6" />
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

export { PlayerControls };
