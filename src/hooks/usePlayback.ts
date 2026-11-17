import { RepeatState, ShuffleState, type Song } from "@/models";
import { createContext, useContext } from "react";


interface PlaybackContextValue {
  playlist: Song[];
  nowPlaying: Song | undefined;
  nowPlayingIndex: number | undefined;
  shuffle: ShuffleState;
  repeat: RepeatState;
  volume: number;
  muted: boolean;
  isPlaying: boolean;
  /**
   * True while the current track's audio is being fetched and decoded. A
   * remote source has to download the whole file before it can play, so the
   * seek bar shows this rather than appearing stuck at zero.
   */
  isBuffering: boolean;
  /** Query only — actions are issued as events/commands on the WmmBus. */
  getCurrentTime: () => number;
  getCollectionIds: () => string[];
  /** Live analyser for visualizers; null until the audio graph exists. */
  getAnalyser: () => AnalyserNode | null;
  /** Duration of the loaded track in seconds (0 when nothing is loaded). */
  getDuration: () => number;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error("usePlayback must be used inside PlaybackProvider");
  return ctx;
}

export {
  ShuffleState,
  RepeatState,
  PlaybackContext,
  usePlayback,
};
