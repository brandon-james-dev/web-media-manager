import type {
  Song,
  PendingWriteJob,
  PendingImportJob,
  ThumbnailEntry,
  PendingArtJob,
} from "@/models";
import Dexie, { type Table } from "dexie";

export class MediaDB extends Dexie {
  songs!: Table<Song, string>;
  thumbnails!: Table<ThumbnailEntry, string>;
  pendingWrites!: Table<PendingWriteJob, number>;
  pendingImports!: Table<PendingImportJob, number>;
  pendingArt!: Table<PendingArtJob, number>;

  constructor() {
    super("mediaDb");

    this.version(1).stores({
      songs: `
        id,
        tags.title,
        tags.artist,
        tags.album,
        tags.genre,
        duration,
        bitrate,
        mtime
      `,
      pendingWrites: `
        ++id,
        songId,
        createdAt
      `,
      pendingImports: `
        ++id,
        createdAt
      `,
      thumbnails: `
        songId
        thumbSmall,
        thumbMedium,
        thumbLarge,
        thumbXLarge
      `,
      pendingArt: `
        ++id,
        songId,
        createdAt
      `,
    });
  }
}

export const db = new MediaDB();
