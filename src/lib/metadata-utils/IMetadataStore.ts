import type { Song } from "@/models/Song";

export type SongCallback = (song: Song) => void;

export interface IMetadataStore {
  getSong(id: string): Promise<Song | null>;
  saveSong(id: string, updated: Song): Promise<Song>;
  deleteSong(id: string): Promise<void>;
  getAllSongs(): Promise<Song[]>;
  onSongAdded(cb: SongCallback): () => void;
  onSongUpdated(cb: SongCallback): () => void;
  onSongDeleted(cb: SongCallback): () => void;
}
