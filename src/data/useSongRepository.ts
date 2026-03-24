import { mediaDb } from '@/data';

export function useSongRepository() {
  async function getSongById(id: string) {
    return await mediaDb.songs.get(id);
  }

  async function getSongsByIds(ids: string[]) {
    return await mediaDb.songs.where("id").anyOf(ids).toArray();
  }

  async function updateSong(id: string, updates: any) {
    return await mediaDb.songs.update(id, updates);
  }

  return {
    getSongById,
    getSongsByIds,
    updateSong,
  };
}