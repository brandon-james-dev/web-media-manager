import type { Album } from "./Album";
import type { Song } from "./Song";

export interface Artist {
  id: string;
  name: string;
  songs: Song[];
  /** Albums grouped by title+artist. */
  albums: Album[];
}
