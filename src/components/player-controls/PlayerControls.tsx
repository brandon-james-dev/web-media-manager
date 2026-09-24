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
import { songDoubleClicked$ } from "@/events/song-events";
import { playlistSet$ } from "@/events/player-events";

function PlayerControls() {
  //#region State
  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(false);
  const {
    playlist,
    setPlaylist,
    nowPlaying,
    setNowPlaying,
    playPause,
    prevTrack,
    nextTrack,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    volume,
    setVolume,
    currentTime,
    seek,
    isPlaying,
  } = usePlayback();
  //#endregion

  //#region Subscribe to domain events
  useEffect(() => {
    const subDouble = songDoubleClicked$.subscribe((song) => {
      setNowPlaying(song);
    });

    const subPlaylistSet = playlistSet$.subscribe((songs) => {
      setPlaylist(songs);
    });

    return () => {
      subDouble.unsubscribe();
      subPlaylistSet.unsubscribe();
    };
  }, [playlist, nowPlaying, setPlaylist, setNowPlaying]);
  //#endregion

  //#region Helpers
  function formatTime(time: number) {
    const d = time;
    const m = Math.floor(d / 60);
    const s = `${Math.floor(d % 60)}`.padStart(2, "0");
    return `${m}:${s}`;
  }
  //#endregion

  //#region Interactivity handlers
  function handleVolumeChange(v: number | readonly number[]) {
    setVolume(Number(v));
  }

  function handlePlayPause() {
    playPause();
  }

  function handlePrev() {
    prevTrack();
  }

  function handleNext() {
    nextTrack();
  }

  function handleSeek(v: number | readonly number[]) {
    seek(Number(v));
  }

  function handleShuffleToggle() {
    const nextState = shuffle == "Off" ? shuffleState.On : shuffleState.Off;

    setShuffle(nextState);
  }

  function handleRepeatToggle() {
    const allStates = Object.keys(repeatState).map(
      (k) => k as keyof typeof repeatState
    );
    const next = allStates[(allStates.indexOf(repeat) + 1) % allStates.length];
    setRepeat(next);
  }

  function handlePlaylistItemClick(song: Song) {
    if (nowPlaying?.id == song.id) {
      playPause();
    } else {
      setNowPlaying(song);
    }
  }

  function handlePlaylistItemRemove(song: Song) {
    const index = playlist.findIndex((s) => s.id == song.id);
    if (index !== -1) {
      const result = [
        ...playlist.slice(0, index),
        ...playlist.slice(index + 1),
      ];
      setPlaylist(result);
    }
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
              {formatTime(currentTime)}
            </span>

            <Slider
              defaultValue={[0]}
              min={0}
              max={100}
              step={1}
              value={(currentTime / (nowPlaying?.length ?? 0)) * 100}
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
                      onClick={() => setPlaylist([])}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1 min-h-0 min-w-0 overflow-auto">
                  {playlist.map((s) => (
                    <Item
                      key={s.id}
                      variant="outline"
                      data-now-playing={
                        s.id === nowPlaying?.id ? "true" : "false"
                      }
                      className={s.id == nowPlaying?.id ? "bg-accent/15" : ""}
                      size="xs"
                    >
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
                            s.id === nowPlaying?.id
                              ? "bg-accent hover:bg-accent/70 text-white"
                              : ""
                          }
                          onClick={() => handlePlaylistItemClick(s)}
                        >
                          {s.id === nowPlaying?.id && isPlaying && (
                            <PauseCircle />
                          )}
                          {s.id === nowPlaying?.id && !isPlaying && (
                            <PlayCircle />
                          )}
                          {s.id !== nowPlaying?.id && <PlayCircle />}
                        </Button>
                      </ItemActions>
                    </Item>
                  ))}
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" onClick={() => setVolume(0)}>
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
