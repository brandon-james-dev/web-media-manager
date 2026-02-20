import { mediaDb } from '@/data';
import type { Song } from '@/models/Song';

async function upsertSongToDb(song: Song) {
  await mediaDb.songs.put(song);
}

export { upsertSongToDb };