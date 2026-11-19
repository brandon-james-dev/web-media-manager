export const LyricsProvider = {
  LrcLib: "lrclib",
} as const;

export type LyricsProvider =
  (typeof LyricsProvider)[keyof typeof LyricsProvider];
