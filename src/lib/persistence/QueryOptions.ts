import type { Song } from "@/models";
import { isSongOffline } from "@/lib/offline";

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
  duration: (s: Song) => s.duration,
  bitrate: (s: Song) => s.bitrate,
  /**
   * Offline sorts below online: a cached song yields `false`, an uncached one
   * `true`, so ascending order lists the songs that are already available
   * offline first.
   */
  offline: (s: Song) => !isSongOffline(s.id),
} as const;

export type SortableColumn = keyof typeof selectors;
