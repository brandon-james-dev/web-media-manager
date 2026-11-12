import type { SongArtwork } from "@/models";
import type { ArtworkType } from "../contracts";

export interface ISongArtworkStore {
  getBySong(songId: string): Promise<SongArtwork[]>;
  getBySongAndType(
    songId: string,
    type: ArtworkType
  ): Promise<SongArtwork | undefined>;
  /** Insert a row, or replace it when `artwork.id` is set. Returns the saved row. */
  save(artwork: SongArtwork): Promise<SongArtwork>;
  /** Ids of every song that has at least one artwork row. */
  listSongIdsWithArtwork(): Promise<Set<string>>;
}
