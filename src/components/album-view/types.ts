import type { Song } from "@/models";

export type Album = {
  albumName: string;
  art?: string;
  artist: string;
  songs: Song[];
};