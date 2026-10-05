export const MHOD_TYPES = {
  Title: 1,
  Path: 2,
  Album: 3,
  Artist: 4,
  Genre: 5,
  FileType: 6,

  AlbumSort: 28,
} as const;

export type MhodType = (typeof MHOD_TYPES)[keyof typeof MHOD_TYPES];
