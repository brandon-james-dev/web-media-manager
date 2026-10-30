import type { Song } from "@/models";

export interface SongEditCallbacks {
  onSongUpdated?: (updatedSong: Song) => void;
}
