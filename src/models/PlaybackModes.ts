export const RepeatState = {
  Off: "off",
  One: "one",
  All: "all",
} as const;

export type RepeatState = (typeof RepeatState)[keyof typeof RepeatState];

export const ShuffleState = {
  Off: "off",
  On: "on",
} as const;

export type ShuffleState = (typeof ShuffleState)[keyof typeof ShuffleState];
