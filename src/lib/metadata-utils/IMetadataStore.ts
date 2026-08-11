import type { Song } from "@/models/Song";

export interface IMetadataStore {
  getSong(id: string): Promise<Song | null>;
  saveSong(id: string, updated: Song): Promise<Song>;
  deleteSong(id: string): Promise<void>;
  getAllSongs(): Promise<Song[]>;
}
