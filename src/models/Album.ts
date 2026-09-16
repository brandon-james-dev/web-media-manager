import type { Song } from ".";

export interface Album {
  id: string;
  title: string;
  artist: string;
  pictureSongId?: string;
  songs: Song[];
}
