import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Image,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOutletContext } from "react-router";
import type { SongsContext } from "./Songs";
import { useArtwork } from "@/hooks";
import { ArtworkType } from "@/lib/metadata-utils";
import { getMetadataStore, ThumbnailSize } from "@/lib";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";
import { Slider } from "@/components/ui/slider";

function SongPlayback() {
  //#region State
  const { songs, filteredSongs, selectedSongIds, setSelectedSongIds } =
    useOutletContext<SongsContext>();

  if (selectedSongIds.length == 0) {
    setSelectedSongIds([filteredSongs[0].id]);
  }
  if (selectedSongIds.length > 1) {
    setSelectedSongIds(selectedSongIds.slice(-1));
  }

  const selectedSong = songs.find((s) => s.id === selectedSongIds[0])!;

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(selectedSong?.length ?? 0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState<number>(0.75);
  const volumeRef = useRef<number>(volume);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  //#endregion
  useEffect(() => {
    if (!selectedSong) return;

    let cancelled = false;

    async function load() {
      // Create audio context if needed
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();

        gainRef.current = audioCtxRef.current.createGain();
        gainRef.current.gain.value = volumeRef.current;

        // Connect gain → destination
        gainRef.current.connect(audioCtxRef.current.destination);
      }

      const metadataStore = getMetadataStore() as CombinedMetadataStore;
      const fsMetadataStore = metadataStore.getFileSystem();
      const songFileHandle = await fsMetadataStore.getFileHandle(
        selectedSong.id
      );

      if (!songFileHandle) {
        return;
      }

      const ctx = audioCtxRef.current;

      // Load file from disk
      const songFile = await songFileHandle.getFile();
      const arrayBuffer = await songFile.arrayBuffer();

      // Decode into AudioBuffer
      const decoded = await ctx.decodeAudioData(arrayBuffer);

      if (cancelled) return;

      bufferRef.current = decoded;
      setDuration(decoded.duration);

      // Autoplay new track
      startPlaybackAt.current(0);
    }

    load();

    return () => {
      cancelled = true;
      stopPlayback();
    };
  }, [selectedSong]);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume;
    }
  }, [volume]);

  function formatTime(time: number) {
    const d = time;
    const m = Math.floor(d / 60);
    const s = `${Math.floor(d % 60)}`.padStart(2, "0");
    return `${m}:${s}`;
  }

  function handleVolumeChange(v: number | readonly number[]) {
    setVolume(Number(v));
  }

  function stopPlayback() {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }

  const startPlaybackAt = useRef((time: number) => {
    const ctx = audioCtxRef.current;
    const buffer = bufferRef.current;
    const gain = gainRef.current;

    if (!ctx || !buffer || !gain) return;

    stopPlayback();

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    source.connect(gain);

    const startTime = ctx.currentTime - time;
    source.start(0, time);

    sourceRef.current = source;
    setIsPlaying(true);

    // Track progress
    const update = () => {
      if (!sourceRef.current) return;

      const t = ctx.currentTime - startTime;
      setCurrentTime(t);
      setProgress((t / buffer.duration) * 100);

      if (t < buffer.duration) {
        requestAnimationFrame(update);
      } else {
        handleNext();
      }
    };

    requestAnimationFrame(update);
  });

  function handlePlayPause() {
    if (isPlaying) {
      stopPlayback();
      setIsPlaying(false);
    } else {
      startPlaybackAt.current(currentTime);
    }
  }

  function handlePrev() {
    const index = filteredSongs.findIndex((s) => s.id === selectedSong?.id);
    if (index <= 0) return;

    const prevSong = filteredSongs[index - 1];
    setSelectedSongIds([prevSong.id]);
  }

  function handleNext() {
    const index = filteredSongs.findIndex((s) => s.id === selectedSong?.id);
    if (index === -1 || index >= filteredSongs.length - 1) return;

    const nextSong = filteredSongs[index + 1];
    setSelectedSongIds([nextSong.id]);
  }

  function handleSeek(v: number | readonly number[]) {
    const pct = Number(v);
    const newTime = (pct / 100) * duration;

    startPlaybackAt.current(newTime);
  }

  const artwork = useArtwork(
    selectedSong.id,
    ArtworkType.FrontCover,
    ThumbnailSize.thumb64
  );

  function getArtwork(): string | undefined {
    if (!artwork || artwork.length === 0) return undefined;

    const pic = artwork[0];
    const blob = new Blob([pic.data.slice()], { type: pic.mimeType });

    return URL.createObjectURL(blob);
  }

  const coverFront = getArtwork();

  return (
    <div className="flex shrink-0 p-4 border-t bg-secondary/50 select-none">
      <div className="mx-auto w-full flex items-center justify-between">
        <div className="flex w-60 items-center gap-3">
          {coverFront ? (
            <img
              src={coverFront ?? "/placeholder.png"}
              alt={selectedSong?.title}
              draggable="false"
              className="h-12 w-12 rounded-md object-cover border"
            />
          ) : (
            <div className="w-12 aspect-square rounded-md border flex items-center justify-center">
              <Image color="var(--accent)" />
            </div>
          )}

          <div className="flex flex-col overflow-hidden">
            <span className="font-medium truncate">
              {selectedSong?.title ?? "No song selected"}
            </span>
            <span className="text-sm text-muted-foreground truncate">
              {selectedSong?.artist ?? ""}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Button
              size="lg"
              variant="ghost"
              onClick={handlePrev}
              disabled={
                !selectedSong || filteredSongs[0].id === selectedSong.id
              }
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
              disabled={
                !selectedSong ||
                filteredSongs[filteredSongs.length - 1].id === selectedSong.id
              }
            >
              <SkipForward className="fill-secondary-foreground" />
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
              value={progress}
              onValueChange={handleSeek}
              className="flex-1"
            />

            <span className="text-xs w-10">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="w-60 flex items-center justify-end gap-3">
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
