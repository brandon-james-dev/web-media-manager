import { useEffect, useMemo, useRef, useState } from "react";
import {
  PlaybackContext,
  type ShuffleState,
  type RepeatState,
  shuffleState,
  repeatState,
} from "@/hooks/usePlayback";
import {
  getMetadataStore,
  ThumbnailSize,
} from "@/lib";
import { getPictureOfType } from "@/core/media";
import { commandDispatcher, wmmBus } from "@/core/events";
import { getStore } from "@/core/system";
import type { CombinedMetadataStore } from "@/lib/persistence/browser/CombinedMetadataStore";
import { ArtworkType } from "@/lib/contracts";
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

        const artwork = await getPictureOfType(
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
      wmmBus.publish("wmm.playback.started", { songId: nowPlaying.id });

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
  // Register playback commands on the dispatch registry so the bus can
  // drive them from shortcuts, UI buttons, or configurable bindings.
  useEffect(() => {
    const unregister = commandDispatcher.register("wmm.playback.playpause", () =>
      playPauseRef.current()
    );
    const unregisterStop = commandDispatcher.register("wmm.playback.stop", () =>
      stopPlayback()
    );
    const unregisterNext = commandDispatcher.register("wmm.playback.next", () =>
      nextTrack.current()
    );
    const unregisterPrev = commandDispatcher.register("wmm.playback.prev", () =>
      prevTrack.current()
    );
    const unregisterSeek = commandDispatcher.register(
      "wmm.playback.seek",
      (payload?: { positionSeconds?: number }) => {
        if (payload?.positionSeconds !== undefined) {
          seek.current(payload.positionSeconds);
        }
      }
    );
    const unregisterVolume = commandDispatcher.register(
      "wmm.playback.setVolume",
      (payload?: { volume?: number }) => {
        if (payload?.volume !== undefined) setVolume(payload.volume);
      }
    );
    const unregisterShuffle = commandDispatcher.register(
      "wmm.playback.toggleShuffle",
      () => setShuffle((prev) => (prev === shuffleState.On ? shuffleState.Off : shuffleState.On))
    );
    const unregisterRepeat = commandDispatcher.register(
      "wmm.playback.toggleRepeat",
      () =>
        setRepeat((prev) => {
          // Cycle: Off -> One -> All -> Off
          if (prev === repeatState.Off) return repeatState.One;
          if (prev === repeatState.One) return repeatState.All;
          return repeatState.Off;
        })
    );
    // Queue commands resolve song ids via the store, so payloads carry ids
    // (never whole objects) — the provider is the id -> Song owner.
    const unregisterPlaySong = commandDispatcher.register(
      "wmm.playback.playSong",
      async (payload?: { songId?: string }) => {
        if (!payload?.songId) return;
        const song = await getStore().get(payload.songId);
        if (!song) return;
        setNowPlaying(song);
        startPlaybackAt.current(currentTimeRef.current);
      }
    );
    const unregisterPlayQueue = commandDispatcher.register(
      "wmm.playback.playQueue",
      async (payload?: { songIds?: string[] }) => {
        if (!payload?.songIds?.length) return;
        const songs = (
          await Promise.all(
            payload.songIds.map((id) => getStore().get(id))
          )
        ).filter((s): s is Song => s !== null && s !== undefined);
        if (songs.length) {
          setPlaylist(songs);
          wmmBus.publish("wmm.playback.queueChanged", {
            songIds: songs.map((s) => s.id),
          });
        }
      }
    );
    const unregisterClearQueue = commandDispatcher.register(
      "wmm.playback.clearQueue",
      () => {
        setPlaylist([]);
        wmmBus.publish("wmm.playback.queueChanged", { songIds: [] });
      }
    );
    const unregisterRemoveFromQueue = commandDispatcher.register(
      "wmm.playback.removeFromQueue",
      (payload?: { songId?: string }) => {
        if (!payload?.songId) return;
        setPlaylist((prev) => {
          const next = prev.filter((s) => s.id !== payload.songId);
          wmmBus.publish("wmm.playback.queueChanged", {
            songIds: next.map((s) => s.id),
          });
          return next;
        });
      }
    );
    // Add a song to the queue (context menu "Add to playlist", shortcut).
    const unregisterAddSong = commandDispatcher.register(
      "wmm.playlists.addSong",
      async (payload?: { songId?: string }) => {
        if (!payload?.songId) return;
        const song = await getStore().get(payload.songId);
        if (!song) return;
        setPlaylist((prev) => {
          const next = [...prev, song];
          wmmBus.publish("wmm.playback.queueChanged", {
            songIds: next.map((s) => s.id),
          });
          return next;
        });
      }
    );

    return () => {
      unregister();
      unregisterStop();
      unregisterNext();
      unregisterPrev();
      unregisterSeek();
      unregisterVolume();
      unregisterShuffle();
      unregisterRepeat();
      unregisterPlaySong();
      unregisterPlayQueue();
      unregisterClearQueue();
      unregisterRemoveFromQueue();
      unregisterAddSong();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  //#endregion

  return (
    <PlaybackContext.Provider
      value={{
        playlist,
        nowPlaying,
        nowPlayingIndex,
        shuffle,
        repeat,
        volume,
        getCurrentTime,
        isPlaying,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}
