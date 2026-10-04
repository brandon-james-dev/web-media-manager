import {
  PlaybackContext,
  type ShuffleState,
  type RepeatState,
  shuffleState,
  repeatState,
} from "@/hooks/usePlayback";
import {
  getMetadataStore,
  getPicturesForSongOfType,
  ThumbnailSize,
} from "@/lib";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";
import { ArtworkType } from "@/lib/metadata-utils";
import type { Song } from "@/models";
import { useEffect, useRef, useState } from "react";

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  //#region State
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Song | undefined>();
  const [shuffle, setShuffle] = useState<ShuffleState>(shuffleState.Off);
  const [repeat, setRepeat] = useState<RepeatState>(repeatState.Off);
  const [volume, setVolume] = useState<number>(0.75);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playedSongIds, setPlayedSongIds] = useState<string[]>([]);
  const nowPlayingIndex = nowPlaying
    ? playlist.findIndex((s) => s.id === nowPlaying.id)
    : -1;

  const volumeRef = useRef<number>(volume);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  //#endregion

  //#region Helpers
  function stopPlayback() {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }

  function startPlaybackAt(time: number) {
    const ctx = audioCtxRef.current;
    const buffer = bufferRef.current;
    const gain = gainRef.current;

    if (!ctx || !buffer || !gain) return;

    // ensure context is running
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    stopPlayback();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);

    const offset = Math.max(0, Math.min(time, buffer.duration - 0.001));
    const startCtxTime = ctx.currentTime;

    source.start(0, offset);

    sourceRef.current = source;
    setIsPlaying(true);
    navigator.mediaSession.playbackState = "playing";

    source.onended = () => {
      if (sourceRef.current === source) {
        sourceRef.current = null;
        setIsPlaying(false);
        navigator.mediaSession.playbackState = "paused";
        nextTrack();
      }
    };

    const update = () => {
      if (sourceRef.current !== source) return;

      const elapsed = ctx.currentTime - startCtxTime;
      const t = offset + elapsed;

      setCurrentTime(t);

      if (t < buffer.duration) {
        requestAnimationFrame(update);
      } else {
        navigator.mediaSession.setPositionState?.({
          duration: buffer.duration,
          playbackRate: 1,
          position: buffer.duration,
        });
      }
    };

    requestAnimationFrame(update);
  }

  //#endregion

  //#region Effects
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!nowPlaying) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();

        gainRef.current = audioCtxRef.current.createGain();
        gainRef.current.gain.value = volumeRef.current;

        gainRef.current.connect(audioCtxRef.current.destination);
      }

      let artworkUrl256: string | undefined = "";
      let artworkUrl512: string | undefined = "";

      async function getArtwork(
        thumbnailSize: ThumbnailSize
      ): Promise<string | undefined> {
        if (!nowPlaying) return;

        const artwork = await getPicturesForSongOfType(
          nowPlaying.id,
          ArtworkType.FrontCover,
          thumbnailSize
        );

        if (!artwork) return undefined;

        const blob = new Blob([artwork.data.slice()], {
          type: artwork.mimeType,
        });

        return URL.createObjectURL(blob);
      }

      const metadataStore = getMetadataStore() as CombinedMetadataStore;
      const fsMetadataStore = metadataStore.getFileSystem();
      const songFileHandle = await fsMetadataStore.getFileHandle(nowPlaying.id);

      if (!songFileHandle) return;

      const songFile = await songFileHandle.getFile();
      const arrayBuffer = await songFile.arrayBuffer();

      const ctx = audioCtxRef.current!;
      const decoded = await ctx.decodeAudioData(arrayBuffer);

      if (cancelled) return;

      bufferRef.current = decoded;
      setCurrentTime(0);

      startPlaybackAt(0);

      artworkUrl256 = await getArtwork(ThumbnailSize.thumb256);
      artworkUrl512 = await getArtwork(ThumbnailSize.thumb512);

      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: nowPlaying?.title ?? "",
          artist: nowPlaying?.artist ?? "",
          album: nowPlaying?.album ?? "",
          artwork: [
            { src: artworkUrl256 ?? "", sizes: "256x256", type: "image/png" },
            { src: artworkUrl512 ?? "", sizes: "512x512", type: "image/png" },
          ],
        });

        navigator.mediaSession.playbackState = "playing";

        navigator.mediaSession.setPositionState?.({
          duration: decoded.duration,
          playbackRate: 1,
          position: 0,
        });
      }
    }

    load();

    return () => {
      cancelled = true;
      stopPlayback();
    };
  }, [nowPlaying]);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume;
    }
    volumeRef.current = volume;
  }, [volume]);

  // Media Session action handlers
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => {
      playPause();
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      playPause();
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      nextTrack();
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      prevTrack();
    });

    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime != null) {
        const buffer = bufferRef.current;
        if (!buffer) return;

        const pct = (details.seekTime / buffer.duration) * 100;
        seek(pct);
      }
    });
  }, [playlist, nowPlaying, currentTime, isPlaying, shuffle, repeat, volume]);
  //#endregion

  //#region Controls
  function playPause() {
    if (!bufferRef.current) return;

    if (isPlaying) {
      stopPlayback();
      setIsPlaying(false);
      navigator.mediaSession.playbackState = "paused";
    } else {
      startPlaybackAt(currentTime);
      navigator.mediaSession.playbackState = "playing";
    }
  }

  function seek(v: number) {
    if (!nowPlaying?.length) return;

    const pct = Number(v);
    let newTime = (pct / 100) * nowPlaying.length;

    if (newTime >= nowPlaying.length) {
      newTime = nowPlaying.length - 0.001;
    }

    if (isPlaying) {
      startPlaybackAt(newTime);
    } else {
      setCurrentTime(newTime);
    }
    navigator.mediaSession.setPositionState?.({
      duration: nowPlaying.length,
      playbackRate: 1,
      position: newTime,
    });
  }

  function prevTrack() {
    if (!playlist.length) return;
    if (!nowPlaying) return;

    if (isPlaying && currentTime > 1.0) {
      startPlaybackAt(0);
      return;
    }

    if (repeat === repeatState.One) {
      startPlaybackAt(0);
      return;
    }

    if (shuffle === shuffleState.On) {
      if (playedSongIds.length < 2) {
        if (repeat === repeatState.All) {
          const lastSong = playlist[playlist.length - 1];
          setNowPlaying(lastSong);
        }
        return;
      }

      const [, prevId, ...rest] = playedSongIds;

      setPlayedSongIds([prevId, ...rest]);

      const prevSong = playlist.find((s) => s.id === prevId);
      if (prevSong) {
        setNowPlaying(prevSong);
      }

      return;
    }

    const prevIndex = nowPlayingIndex - 1;

    if (repeat === repeatState.Off) {
      if (prevIndex < 0) return;
      setNowPlaying(playlist[prevIndex]);
      return;
    }

    if (repeat === repeatState.All) {
      const wrappedIndex = prevIndex < 0 ? playlist.length - 1 : prevIndex;
      setNowPlaying(playlist[wrappedIndex]);
      return;
    }
  }

  function nextTrack() {
    if (!playlist.length) return;
    if (!nowPlaying) return;

    if (repeat === repeatState.One) {
      startPlaybackAt(0);
      return;
    }

    if (shuffle === shuffleState.On) {
      setPlayedSongIds((prev) => {
        const updated = [nowPlaying.id, ...prev];

        const unplayed = playlist.filter((s) => !updated.includes(s.id));

        if (unplayed.length === 0) {
          const randomSong =
            playlist[Math.floor(Math.random() * playlist.length)];
          setNowPlaying(randomSong);
          return [];
        }

        const nextSong = unplayed[Math.floor(Math.random() * unplayed.length)];
        setNowPlaying(nextSong);
        return updated;
      });

      return;
    }

    const nextIndex = nowPlayingIndex + 1;

    if (repeat === repeatState.Off) {
      if (nextIndex >= playlist.length) return;
      setNowPlaying(playlist[nextIndex]);
      return;
    }

    if (repeat === repeatState.All) {
      const wrappedIndex = nextIndex % playlist.length;
      setNowPlaying(playlist[wrappedIndex]);
      return;
    }
  }
  //#endregion

  return (
    <PlaybackContext.Provider
      value={{
        playlist,
        setPlaylist,
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
        nowPlaying,
        setNowPlaying,
        isPlaying,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}
