import { mediaDb } from '@/data';
import type { Song } from '@/models';
import type { UpdateSpec } from 'dexie';

export function SongRepository() {
  async function getSongById(id: string) {
    return await mediaDb.songs.get(id);
  }

  async function getSongsByIds(ids: string[]) {
    return await mediaDb.songs.where("id").anyOf(ids).toArray();
  }

  async function updateSong(id: string, updates: UpdateSpec<Song>) {
    return await mediaDb.songs.update(id, updates);
  }

  return {
    getSongById,
    getSongsByIds,
    updateSong,
  };
}
