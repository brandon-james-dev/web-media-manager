export const MHSD_TYPES = {
  TrackList: 1,
  Playlists: 2,
  PlaylistIndex: 3,
  Artwork: 4,
  LibraryData: 5,
} as const;

export type MhsdType = (typeof MHSD_TYPES)[keyof typeof MHSD_TYPES];
