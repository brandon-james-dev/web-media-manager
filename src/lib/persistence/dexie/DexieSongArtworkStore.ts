import type { SongArtwork } from "@/models";
import type { ArtworkType } from "../../contracts";
import type { ISongArtworkStore } from "../ISongArtworkStore";
import { getWmmMusicDb, type WmmMusicDb } from "./WmmMusicDb";

export class DexieSongArtworkStore implements ISongArtworkStore {
  private readonly db: WmmMusicDb;

  constructor(db: WmmMusicDb = getWmmMusicDb()) {
    this.db = db;
  }

  getBySong(songId: string): Promise<SongArtwork[]> {
    return this.db.songArtwork.where("songId").equals(songId).toArray();
  }

  getBySongAndType(
    songId: string,
    type: ArtworkType
  ): Promise<SongArtwork | undefined> {
    return this.db.songArtwork
      .where("songId")
      .equals(songId)
      .filter((row) => row.artworkType === type)
      .first();
  }

  async save(artwork: SongArtwork): Promise<SongArtwork> {
    const id = await this.db.songArtwork.put(artwork);
    return { ...artwork, id };
  }

  async listSongIdsWithArtwork(): Promise<Set<string>> {
    const keys = await this.db.songArtwork.orderBy("songId").uniqueKeys();
    return new Set(keys as string[]);
  }
}
