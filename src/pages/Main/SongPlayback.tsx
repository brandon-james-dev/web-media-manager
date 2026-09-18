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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtworkType } from "@/lib/metadata-utils";
import { getPicturesForSongOfType, ThumbnailSize } from "@/lib";
import { Slider } from "@/components/ui/slider";
import { repeatState, shuffleState, usePlayback } from "@/hooks/usePlayback";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import type { SongsContext } from "./Songs";
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

function SongPlayback() {
  //#region State
  const { songs, selectedSongIds, setSelectedSongIds } =
    useOutletContext<SongsContext>();

  if (selectedSongIds.length == 0) {
    setSelectedSongIds([songs[0].id]);
  }
  if (selectedSongIds.length > 1) {
    setSelectedSongIds(selectedSongIds.slice(-1));
  }

  const selectedSong = songs.find((s) => s.id == selectedSongIds.at(0));

  const [coverFront, setCoverFront] = useState<string | undefined>();
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

  //#region Helpers
  useEffect(() => {
    if (!nowPlaying) return;
    let cancelled = false;

    async function getArtwork(): Promise<string | undefined> {
      if (!nowPlaying) return;
      if (cancelled) return;

      const artwork = await getPicturesForSongOfType(
        nowPlaying.id,
        ArtworkType.FrontCover,
        ThumbnailSize.thumb64
      );

      if (!artwork || artwork.length === 0) return undefined;
      if (cancelled) return;

      const pic = artwork[0];
      const blob = new Blob([pic.data.slice()], { type: pic.mimeType });

      return URL.createObjectURL(blob);
    }

    async function load() {
      if (!nowPlaying) return;
      const cover = await getArtwork();
      setCoverFront(cover);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [nowPlaying]);

  useEffect(() => {
    setPlaylist(songs);
  }, [songs, setPlaylist]);

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
    if (!nowPlaying && selectedSong != undefined) {
      setNowPlaying(selectedSong);
    }
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

  function handleShuffle() {
    const nextState = shuffle == "Off" ? shuffleState.On : shuffleState.Off;

    setShuffle(nextState);
  }

  function handleRepeat() {
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
  //#endregion

  return (
    <div className="flex shrink-0 p-4 border-t bg-secondary/50 select-none">
      <div className="mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          {coverFront ? (
            <img
              src={coverFront ?? "/placeholder.png"}
              alt={nowPlaying?.title}
              draggable="false"
              className="h-12 w-12 rounded-md object-cover border"
            />
          ) : (
            <div className="w-12 aspect-square rounded-md border flex items-center justify-center">
              <Disc3 className="text-accent" />
            </div>
          )}

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
              onClick={handleShuffle}
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
              onClick={handleRepeat}
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
          <Popover>
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
            <PopoverContent
              align="center"
              className="w-80 max-h-80 overflow-y-auto select-none"
            >
              <h3>Playlist - {playlist.length} items</h3>
              {playlist.map((s) => (
                <Item key={s.id} variant="outline" size="xs">
                  <ItemContent>
                    <ItemTitle>{s.title}</ItemTitle>
                    <ItemDescription>{s.artist}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="ghost"
                      onClick={() => handlePlaylistItemClick(s)}
                    >
                      {s.id === nowPlaying?.id && isPlaying && <PauseCircle />}
                      {s.id === nowPlaying?.id && !isPlaying && <PlayCircle />}
                      {s.id !== nowPlaying?.id && <PlayCircle />}
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </PopoverContent>
          </Popover>

          <Volume2 className="fill-secondary-foreground w-6" />

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

export { SongPlayback };
