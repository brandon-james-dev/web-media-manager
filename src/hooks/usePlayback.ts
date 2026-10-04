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
  setPlaylist: (songs: Song[]) => void;
  nowPlaying: Song | undefined;
  setNowPlaying: (song: Song) => void;
  playPause: () => void;
  prevTrack: () => void;
  nextTrack: () => void;
  shuffle: ShuffleState;
  setShuffle: (shuffleState: ShuffleState) => void;
  repeat: RepeatState;
  setRepeat: (repeatState: RepeatState) => void;
  volume: number;
  setVolume: (volume: number) => void;
  currentTime: number;
  seek: (trackPostion: number) => void;
  isPlaying: boolean;
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
