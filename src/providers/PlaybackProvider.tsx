import { useEffect, useMemo, useRef, useState } from "react";
import {
  addSongToPlaylist$,
  pausePlayback$,
  playSong$,
} from "@/events/song-events";
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

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  //#region State
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [shuffle, setShuffle] = useState<ShuffleState>(shuffleState.Off);
  const [repeat, setRepeat] = useState<RepeatState>(repeatState.Off);
  const [volume, setVolume] = useState(0.75);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<Song | undefined>(undefined);

  const nowPlayingIndex = useMemo(() => {
    if (!nowPlaying) {
      return -1;
    }

    return playlist.findIndex((song) => song.id === nowPlaying.id);
  }, [playlist, nowPlaying]);
  //#endregion

  //#region Refs
  //#region Playback State Refs
  const playlistRef = useRef<Song[]>([]);
  const shuffleRef = useRef<ShuffleState>(shuffleState.Off);
  const repeatRef = useRef<RepeatState>(repeatState.Off);
  const playedSongIdsRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const nowPlayingRef = useRef<Song | undefined>(undefined);
  const nowPlayingIndexRef = useRef<number>(0);
  const currentTimeRef = useRef(0);
  const volumeRef = useRef(0.75);
  //#endregion

  //#region Audio Engine Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  //#endregion
  //#endregion

  //#region State Synchronization
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);

  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
  }, [nowPlaying]);

  useEffect(() => {
    nowPlayingIndexRef.current = nowPlayingIndex;
  }, [nowPlayingIndex]);

  useEffect(() => {
    volumeRef.current = volume;

    if (gainRef.current) {
      gainRef.current.gain.value = volume;
    }
  }, [volume]);

  //#endregion

  //#region Helpers
  function playPause() {
    if (isPlaying) {
      pausePlayback$.next(true);
    } else {
      if (!nowPlayingRef.current) return;
      playSong$.next(nowPlayingRef.current);
    }
  }

  function getCurrentTime(): number {
    return currentTimeRef.current;
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
        nextTrack.current();
      }
    };

    const update = () => {
      if (sourceRef.current !== source) {
        return;
      }

      const elapsed = ctx.currentTime - startCtxTime;

      currentTimeRef.current = offset + elapsed;

      if (currentTimeRef.current < buffer.duration) {
        requestAnimationFrame(update);
      }
    };

    update();
  });

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
      currentTimeRef.current = 0;

      startPlaybackAt.current(0);

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
      playPauseRef.current();
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      playPauseRef.current();
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      nextTrack.current();
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      prevTrack.current();
    });

    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime != null) {
        const buffer = bufferRef.current;
        if (!buffer) return;

        const pct = (details.seekTime / buffer.duration) * 100;
        seek.current(pct);
      }
    });
  }, []);
  //#endregion

  //#region Controls
  const playPauseRef = useRef(() => {
    if (!bufferRef.current) return;

    if (isPlayingRef.current) {
      stopPlayback();
      setIsPlaying(false);

      navigator.mediaSession.playbackState = "paused";
    } else {
      startPlaybackAt.current(currentTimeRef.current);
      navigator.mediaSession.playbackState = "playing";
    }
  });

  const seek = useRef((v: number) => {
    if (!nowPlayingRef.current?.length) return;

    const pct = Number(v);
    let newTime = (pct / 100) * nowPlayingRef.current.length;

    if (newTime >= nowPlayingRef.current.length) {
      newTime = nowPlayingRef.current.length - 0.001;
    }

    if (isPlayingRef.current) {
      startPlaybackAt.current(newTime);
    } else {
      currentTimeRef.current = newTime;
    }
    navigator.mediaSession.setPositionState?.({
      duration: nowPlayingRef.current.length,
      playbackRate: 1,
      position: newTime,
    });
  });

  const prevTrack = useRef(() => {
    const pl = playlistRef.current;
    const playedSongIds = playedSongIdsRef.current;

    if (!pl.length) return;
    if (!nowPlaying) return;

    if (isPlaying && getCurrentTime() > 1.0) {
      startPlaybackAt.current(0);
      return;
    }

    if (repeat === repeatState.One) {
      startPlaybackAt.current(0);
      return;
    }

    if (shuffle === shuffleState.On) {
      if (playedSongIds.length < 2) {
        if (repeat === repeatState.All) {
          const lastSong = pl[pl.length - 1];
          setNowPlaying(lastSong);
        }
        return;
      }

      const [, prevId, ...rest] = playedSongIds;

      playedSongIdsRef.current = [prevId, ...rest];

      const prevSong = pl.find((s) => s.id === prevId);
      if (prevSong) {
        setNowPlaying(prevSong);
      }

      return;
    }

    const prevIndex = nowPlayingIndex ?? 0 - 1;

    if (repeat === repeatState.Off) {
      if (prevIndex < 0) return;
      setNowPlaying(pl[prevIndex]);
      return;
    }

    if (repeat === repeatState.All) {
      const wrappedIndex = prevIndex < 0 ? pl.length - 1 : prevIndex;
      setNowPlaying(pl[wrappedIndex]);
      return;
    }
  });

  const nextTrack = useRef(() => {
    const pl = playlistRef.current;
    if (!playlistRef.current.length) {
      return;
    }

    if (!nowPlayingRef.current) {
      return;
    }

    if (repeat === repeatState.One) {
      startPlaybackAt.current(0);

      return;
    }

    if (shuffle === shuffleState.On) {
      const updated = [nowPlayingRef.current.id, ...playedSongIdsRef.current];
      const unplayed = pl.filter((song) => !updated.includes(song.id));

      if (unplayed.length === 0) {
        playedSongIdsRef.current = [];

        setNowPlaying(pl[Math.floor(Math.random() * pl.length)]);

        return;
      }

      playedSongIdsRef.current = updated;

      setNowPlaying(unplayed[Math.floor(Math.random() * unplayed.length)]);
    }

    const nextIndex = nowPlayingIndexRef.current + 1;

    if (repeat === repeatState.Off) {
      if (nextIndex >= pl.length) return;
      setNowPlaying(playlistRef.current[nextIndex]);
      return;
    }

    if (repeat === repeatState.All) {
      const wrappedIndex = nextIndex % playlist.length;
      setNowPlaying(playlist[wrappedIndex]);
      return;
    }
  });
  //#endregion

  //#region Global event handlers
  useEffect(() => {
    const playSongSub = playSong$.subscribe(async (song) => {
      setNowPlaying(song);
      startPlaybackAt.current(currentTimeRef.current);
    });

    return () => playSongSub.unsubscribe();
  }, []);

  useEffect(() => {
    const pausePlaybackSub = pausePlayback$.subscribe(() =>
      playPauseRef.current()
    );

    return () => pausePlaybackSub.unsubscribe();
  }, []);

  useEffect(() => {
    const addToPlaylistSub = addSongToPlaylist$.subscribe((nextSong: Song) =>
      setPlaylist([...playlist, nextSong])
    );

    return () => addToPlaylistSub.unsubscribe();
  }, [playlist]);
  //#endregion

  return (
    <PlaybackContext.Provider
      value={{
        playlist,
        setPlaylist,
        playPause,
        seek: (time: number) => seek.current(time),
        prevTrack: () => prevTrack.current(),
        nextTrack: () => nextTrack.current(),
        shuffle,
        setShuffle,
        repeat,
        setRepeat,
        volume,
        setVolume,
        getCurrentTime,
        isPlaying,
        nowPlaying,
        setNowPlaying,
        nowPlayingIndex,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}
