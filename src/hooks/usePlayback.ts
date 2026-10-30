import type { Song } from "@/models";
import { createContext, useContext } from "react";

type RepeatState = "Off" | "One" | "All";

const repeatState = {
  Off: "Off",
  One: "One",
  All: "All",
} as const;

type ShuffleState = "Off" | "On";

const shuffleState = {
  Off: "Off",
  On: "On",
} as const;

interface PlaybackContextValue {
  playlist: Song[];
  nowPlaying: Song | undefined;
  nowPlayingIndex: number | undefined;
  shuffle: ShuffleState;
  repeat: RepeatState;
  volume: number;
  isPlaying: boolean;
  /** Query only — actions are issued as events/commands on the WmmBus. */
  getCurrentTime: () => number;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error("usePlayback must be used inside PlaybackProvider");
  return ctx;
}

export {
  type ShuffleState,
  type RepeatState,
  repeatState,
  shuffleState,
  PlaybackContext,
  usePlayback,
};
