export const MetadataProvider = {
  iTunes: "itunes",
  MusicBrainz: "musicbrainz",
} as const;

export type MetadataProvider =
  (typeof MetadataProvider)[keyof typeof MetadataProvider];
