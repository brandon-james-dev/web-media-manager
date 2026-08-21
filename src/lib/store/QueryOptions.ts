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
  year: (s: Song) => s.year,
} as const;

export type SortableColumn = keyof typeof selectors;
