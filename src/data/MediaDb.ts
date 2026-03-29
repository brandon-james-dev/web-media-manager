import type {
  Song,
  PendingWriteJob,
  PendingImportJob,
  ThumbnailEntry,
  PendingArtJob,
  Folder,
} from "@/models";
import Dexie, { type Table } from "dexie";

/**
 * MediaDB is an indexedDB in-browser database with tables to store songs information
 * and the states of all other data to be imported in the background.
 */
export class MediaDB extends Dexie {
  songs!: Table<Song, string>;
  thumbnails!: Table<ThumbnailEntry, string>;
  folders!: Table<Folder, number>;
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
        folderId,
        createdAt
      `,
      folders: `
        ++id,
        directoryName,
        createdAt
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
        songId,
        thumbSmall,
        thumbMedium,
        thumbLarge,
        thumbXLarge,
        createdAt
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
