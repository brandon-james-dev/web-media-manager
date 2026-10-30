import type { Song } from "@/models";

export type QueryOptions<T> = {
  filter?: (item: T) => boolean;

  sort?: {
    selector: (item: T) => any;
    desc: boolean;
  };

  skip?: number;
  take?: number;
  page?: number;
};

export const selectors = {
  title: (s: Song) => s.title,
  artist: (s: Song) => s.artist,
  album: (s: Song) => s.album,
  track: (s: Song) => s.track,
  genre: (s: Song) => s.genre,
  year: (s: Song) => s.year,
  length: (s: Song) => s.length,
  bitrate: (s: Song) => s.bitrate,
} as const;

export type SortableColumn = keyof typeof selectors;
