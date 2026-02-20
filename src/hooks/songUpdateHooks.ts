import { mediaDb } from '@/data';
import type { Song } from '@/models/Song';

async function upsertSongToDb(song: Song) {
  await mediaDb.songs.put(song);
}

async function clearDb() {
  await mediaDb.songs.clear();
}

export { upsertSongToDb, clearDb };