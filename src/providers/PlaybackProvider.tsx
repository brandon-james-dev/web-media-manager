import { useEffect, useMemo, useRef, useState } from "react";
import {
  PlaybackContext,
  type ShuffleState,
  type RepeatState,
  shuffleState,
  repeatState,
} from "@/hooks/usePlayback";
import { ThumbnailSize } from "@/lib";
import { getPictureOfType } from "@/core/media";
import { commandDispatcher, wmmBus } from "@/events";
import { getStore } from "@/core/system";
import { getPlayHistoryStore, getSourcesStore } from "@/core/ports";
import { ScrobbleTracker } from "@/core/playback/scrobble";
import { musicSourceStrategies } from "@/lib/sources";
import { ArtworkType } from "@/lib/contracts";
import type { Song } from "@/models";
import { restoreVolume, VOLUME_STORAGE_KEY } from "./volume";
import { safeStorageGet, safeStorageSet } from "@/lib/safeStorage";

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  //#region State
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [shuffle, setShuffle] = useState<ShuffleState>(shuffleState.Off);
  const [repeat, setRepeat] = useState<RepeatState>(repeatState.Off);
  const [volume, setVolume] = useState<number>(() =>
    restoreVolume(safeStorageGet(VOLUME_STORAGE_KEY))
  );
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
  /** The current *collection* context (the view's filtered+sorted song ids).
   * Set by the view (e.g. Songs) via setCollectionSource so that when the
   * playlist is empty, next/prev walk the collection in its current
   * sort/filter order. Live — updated on every sort/filter change. */
  const collectionIdsRef = useRef<string[]>([]);
  const playlistRef = useRef<Song[]>([]);
  const shuffleRef = useRef<ShuffleState>(shuffleState.Off);
  const repeatRef = useRef<RepeatState>(repeatState.Off);
  const playedSongIdsRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  /** Set true when the user asks to play a specific song (playSong) so the
   * async load() knows to auto-start once the buffer is decoded — even before
   * isPlayingRef has flipped. Cleared by load() after it starts. */
  const pendingPlayIntentRef = useRef(false);
  const nowPlayingRef = useRef<Song | undefined>(undefined);
  const nowPlayingIndexRef = useRef<number>(0);
  const currentTimeRef = useRef(0);
  const scrobbleRef = useRef(new ScrobbleTracker());
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

    // Persist the volume slider so the initial state can be restored on a
    // later load (see the useState initializer above).
    safeStorageSet(VOLUME_STORAGE_KEY, String(volume));
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

    // Sever the old source's onended BEFORE stopping it, so a replaced/stopped
    // source can never fire its (stale) onended late — that was causing bursts
    // of dead [diag-onended] fires after every pause/resume.
    if (sourceRef.current) {
      sourceRef.current.onended = null;
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
      // Ignore 'ended' that fires from a context suspend (pause): that is not
      // a real end. Only handle genuine completion while the context is
      // running, and only if this is still the active source.
      if (sourceRef.current === source && ctx.state !== "suspended") {
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

      const play = scrobbleRef.current.advance(currentTimeRef.current);
      if (play) {
        void getPlayHistoryStore()
          .record({ ...play, sourceId: nowPlayingRef.current?.sourceId })
          .catch((error) => console.error("Failed to record play:", error));
      }

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
        // Older Safari exposes the AudioContext under the webkit prefix.
        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) {
          // No audio support — playback simply won't start.
          return;
        }
        audioCtxRef.current = new AudioCtx();

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

        const blob = new Blob([artwork.data!.slice()], {
          type: artwork.mimeType,
        });

        return URL.createObjectURL(blob);
      }

      // Resolve the audio bytes through the song's source strategy (local
      // file handle, Subsonic stream, ...) — the provider dispatches by
      // source kind instead of branching on it.
      const sources = await getSourcesStore().getSources();
      const source = sources.find((s) => s.id === nowPlaying.sourceId);
      const strategy = source
        ? musicSourceStrategies.find((s) => s.kind === source.kind)
        : undefined;

      let arrayBuffer: ArrayBuffer | null = null;

      if (strategy) {
        try {
          arrayBuffer = await strategy.resolveSongBytes(nowPlaying);
        } catch (err) {
          console.error("Failed to resolve song bytes:", err);
          return;
        }
      }

      if (!arrayBuffer) return;

      const ctx = audioCtxRef.current!;
      const decoded = await ctx.decodeAudioData(arrayBuffer);

      if (cancelled) return;

      bufferRef.current = decoded;
      currentTimeRef.current = 0;
      scrobbleRef.current.start(nowPlaying.id, decoded.duration, Date.now());

      // Only start playback here if the user actually asked to play (either
      // isPlayingRef is true, or a playSong intent is pending). This avoids
      // both a second-source self-pause AND missing the first play when
      // isPlayingRef hasn't flipped yet (decode is async).
      if (pendingPlayIntentRef.current || isPlayingRef.current) {
        pendingPlayIntentRef.current = false;
        startPlaybackAt.current(0);
      }
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
      // Pause: capture the position, then stop the source. Explicit stop +
      // saved position is deterministic — no context suspend, so no
      // onended-on-suspend and no ctx.currentTime drift that inflates the
      // position past the 30s preview cap on resume.
      stopPlayback();
      isPlayingRef.current = false;
      setIsPlaying(false);

      navigator.mediaSession.playbackState = "paused";
    } else {
      const ctx = audioCtxRef.current;

      if (!ctx || ctx.state === "closed") {
        // The browser cleared the context while paused (its resource policy).
        // Recover: drop the closed context + its decoded buffer and let
        // load() build a fresh one (nulling audioCtxRef forces the recreate).
        audioCtxRef.current = null;
        bufferRef.current = null;
        setNowPlaying(nowPlayingRef.current);
        return;
      }

      // Resume: (re)start at the saved position. If the context was merely
      // suspended (not closed), wake it first; the source was stopped so we
      // always rebuild — deterministic position, no drift.
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      startPlaybackAt.current(currentTimeRef.current);
      isPlayingRef.current = true;
      setIsPlaying(true);
      navigator.mediaSession.playbackState = "playing";
    }
  });

  const seek = useRef((v: number) => {
    if (!nowPlayingRef.current?.duration) return;

    const pct = Number(v);
    let newTime = (pct / 100) * nowPlayingRef.current.duration;

    if (newTime >= nowPlayingRef.current.duration) {
      newTime = nowPlayingRef.current.duration - 0.001;
    }

    if (isPlayingRef.current) {
      startPlaybackAt.current(newTime);
    } else {
      // Paused with a suspended context: the live source ignores a plain
      // currentTimeRef change on resume, so rebuild it at the new position
      // (stays silent — we don't resume the context here).
      startPlaybackAt.current(newTime);
      audioCtxRef.current?.suspend().catch(() => {});
      isPlayingRef.current = false;
    }
    navigator.mediaSession.setPositionState?.({
      duration: nowPlayingRef.current.duration,
      playbackRate: 1,
      position: newTime,
    });
  });

  /**
   * The ids shuffle draws from: the explicit queue when one is loaded,
   * otherwise the live collection (the view's filtered+sorted songs).
   */
  function shufflePoolIds(): string[] {
    return playlistRef.current.length
      ? playlistRef.current.map((s) => s.id)
      : collectionIdsRef.current;
  }

  /** Make a song current by id (queue entries resolve locally, the rest via the store). */
  function playById(id: string) {
    const queued = playlistRef.current.find((s) => s.id === id);
    if (queued) {
      setNowPlaying(queued);
      return;
    }
    void getStore()
      .get(id)
      .then((song) => {
        if (song) setNowPlaying(song);
      });
  }

  const prevTrack = useRef(() => {
    const pl = playlistRef.current;
    const playedSongIds = playedSongIdsRef.current;

    if (!nowPlayingRef.current) return;

    if (isPlayingRef.current && getCurrentTime() > 1.0) {
      startPlaybackAt.current(0);
      return;
    }

    if (repeatRef.current === repeatState.One) {
      startPlaybackAt.current(0);
      return;
    }

    const pool = shufflePoolIds();
    if (shuffleRef.current === shuffleState.On && pool.length) {
      // History is newest-first and excludes the current song, so the
      // previous song is its head.
      if (playedSongIds.length < 1) {
        if (repeatRef.current === repeatState.All) {
          playById(pool[pool.length - 1]);
        }
        return;
      }

      const [prevId, ...rest] = playedSongIds;

      playedSongIdsRef.current = rest;
      playById(prevId);

      return;
    }

    const prevIndex = (nowPlayingIndex ?? 0) - 1;

    // The "queue" for prev: the explicit playlist if one is loaded, otherwise
    // the live collection (current view's sort+filter order).
    const hasPlaylist = playlistRef.current.length > 0;
    const collectionActive = !hasPlaylist;

    // -- Collection context (playlist empty): walk the collection --
    if (collectionActive) {
      const coll = collectionIdsRef.current;
      if (!coll.length) return;
      const currentIdx = coll.indexOf(nowPlayingRef.current!.id);
      // The current song is no longer in the filter: stop playback.
      if (currentIdx === -1) {
        stopPlayback();
        setIsPlaying(false);
        return;
      }
      const prevIdx = currentIdx - 1;
      if (prevIdx < 0) {
        // Start of the collection: repeat-All wraps to the last; otherwise stop.
        if (repeatRef.current === repeatState.All) {
          getStore()
            .get(coll[coll.length - 1])
            .then((song) => {
              if (song) setNowPlaying(song);
            });
        }
        return;
      }
      getStore()
        .get(coll[prevIdx])
        .then((song) => {
          if (song) setNowPlaying(song);
        });
      return;
    }

    if (repeatRef.current === repeatState.Off) {
      if (prevIndex < 0) return;
      setNowPlaying(pl[prevIndex]);
      return;
    }

    if (repeatRef.current === repeatState.All) {
      const wrappedIndex = prevIndex < 0 ? pl.length - 1 : prevIndex;
      setNowPlaying(pl[wrappedIndex]);
      return;
    }
  });

  const nextTrack = useRef(() => {
    const pl = playlistRef.current;

    if (!nowPlayingRef.current) {
      return;
    }

    // Read once at the top so TS doesn't narrow the ref across the function.
    const repeatMode = repeatRef.current;

    if (repeatMode === repeatState.One) {
      startPlaybackAt.current(0);

      return;
    }

    const pool = shufflePoolIds();
    if (shuffleRef.current === shuffleState.On && pool.length) {
      const updated = [nowPlayingRef.current.id, ...playedSongIdsRef.current];
      const unplayed = pool.filter((id) => !updated.includes(id));

      if (unplayed.length === 0) {
        playedSongIdsRef.current = [];
        playById(pool[Math.floor(Math.random() * pool.length)]);
        return;
      }

      playedSongIdsRef.current = updated;
      playById(unplayed[Math.floor(Math.random() * unplayed.length)]);
      return;
    }

    const nextIndex = nowPlayingIndexRef.current + 1;

    // The "queue" for next/prev: the explicit playlist if one is loaded,
    // otherwise the live collection (current view's sort+filter order).
    const hasPlaylist = playlistRef.current.length > 0;
    const collectionActive = !hasPlaylist;

    // -- Collection context (playlist empty): walk the collection --
    if (collectionActive) {
      const coll = collectionIdsRef.current;
      if (!coll.length) return;
      // nowPlayingRef is guarded at the top of nextTrack.
      const currentIdx = coll.indexOf(nowPlayingRef.current!.id);
      // The current song is no longer in the filter: stop playback.
      if (currentIdx === -1) {
        stopPlayback();
        setIsPlaying(false);
        return;
      }
      const nextIdx = currentIdx + 1;
      if (nextIdx >= coll.length) {
        // End of the collection: repeat-All wraps to the first; otherwise stop.
        if (repeatMode === repeatState.All) {
          getStore()
            .get(coll[0])
            .then((song) => {
              if (song) setNowPlaying(song);
            });
        }
        return;
      }
      getStore()
        .get(coll[nextIdx])
        .then((song) => {
          if (song) setNowPlaying(song);
        });
      return;
    }

    if (repeatMode === repeatState.Off) {
      if (nextIndex >= pl.length) return;
      setNowPlaying(playlistRef.current[nextIndex]);
      return;
    }

    if (repeatMode === repeatState.All) {
      const wrappedIndex = nextIndex % pl.length;
      setNowPlaying(pl[wrappedIndex]);
      return;
    }
  });
  //#endregion

  //#region Global event handlers
  // Register playback commands on the dispatch registry so the bus can
  // drive them from shortcuts, UI buttons, or configurable bindings.
  useEffect(() => {
    const unregister = commandDispatcher.register(
      "wmm.playback.playpause",
      () => playPauseRef.current()
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
        if (payload?.volume !== undefined) {
          setVolume(payload.volume);
        }
      }
    );
    const unregisterShuffle = commandDispatcher.register(
      "wmm.playback.toggleShuffle",
      () =>
        setShuffle((prev) =>
          prev === shuffleState.On ? shuffleState.Off : shuffleState.On
        )
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
        // The user asked to play this song: record the intent so load()
        // autoplays once the buffer is ready (isPlayingRef is still false at
        // this point, so the load() gate must not key off it alone).
        pendingPlayIntentRef.current = true;
        // A song the user picked starts a fresh shuffle history.
        playedSongIdsRef.current = [];
        setNowPlaying(song);
        // Always start a freshly-played song from the beginning, even if the
        // same track was left at a non-zero position by a previous preview.
        currentTimeRef.current = 0;
        startPlaybackAt.current(0);
      }
    );
    const unregisterPlayQueue = commandDispatcher.register(
      "wmm.playback.playQueue",
      async (payload?: { songIds?: string[] }) => {
        if (!payload?.songIds?.length) return;
        const songs = (
          await Promise.all(payload.songIds.map((id) => getStore().get(id)))
        ).filter((s): s is Song => s !== null && s !== undefined);
        if (songs.length) {
          // A new queue starts a fresh shuffle history.
          playedSongIdsRef.current = [];
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
    // Play a *collection* (the full view's songs) starting at a given song.
    // Solo-song-in-a-view and album/artist grids use this: the "queue" for
    // next/prev becomes the collection they were browsing, not just the one
    // song. Separates the explicit Playlist context (what you queued) from
    // the Collection context (what you're browsing).
    const unregisterPlayCollection = commandDispatcher.register(
      "wmm.playback.playCollection",
      async (payload?: { songIds?: string[]; startSongId?: string }) => {
        if (!payload?.songIds?.length) return;
        const songs = (
          await Promise.all(payload.songIds.map((id) => getStore().get(id)))
        ).filter((s): s is Song => s !== null && s !== undefined);
        if (!songs.length) return;

        setPlaylist(songs);

        // Start at the clicked song (or the first if not found in the list).
        const startIndex = payload.startSongId
          ? songs.findIndex((s) => s.id === payload.startSongId)
          : 0;
        const actualIndex = startIndex >= 0 ? startIndex : 0;

        setNowPlaying(songs[actualIndex]);
        currentTimeRef.current = 0;

        wmmBus.publish("wmm.playback.queueChanged", {
          songIds: songs.map((s) => s.id),
        });
        wmmBus.publish("wmm.playback.started", {
          songId: songs[actualIndex].id,
        });
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
    // Append songs to the playback queue, preserving the given order.
    const unregisterAddToQueue = commandDispatcher.register(
      "wmm.playback.addToQueue",
      async (payload?: { songIds?: string[] }) => {
        if (!payload?.songIds?.length) return;
        const songs = await Promise.all(
          payload.songIds.map((id) => getStore().get(id))
        );
        const found = songs.filter((song): song is Song => Boolean(song));
        if (!found.length) return;
        setPlaylist((prev) => {
          const next = [...prev, ...found];
          wmmBus.publish("wmm.playback.queueChanged", {
            songIds: next.map((s) => s.id),
          });
          return next;
        });
      }
    );
    // Set the current *collection* context (the view's live filtered+sorted
    // song ids). When the playlist is empty, next/prev + end-of-song walk
    // this list in order; if the current song leaves it (filter change),
    // playback stops.
    const unregisterSetCollection = commandDispatcher.register(
      "wmm.playback.setCollectionSource",
      (payload?: { songIds?: string[] }) => {
        if (!payload?.songIds) return;
        collectionIdsRef.current = payload.songIds;
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
      unregisterPlayCollection();
      unregisterRemoveFromQueue();
      unregisterAddSong();
      unregisterAddToQueue();
      unregisterSetCollection();
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
