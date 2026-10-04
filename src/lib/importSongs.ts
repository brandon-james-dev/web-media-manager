import type { Song } from "@/models/Song";
import type { IMetadataStore } from "./metadata-utils/IMetadataStore";

/**
 * This function puts already extracted song data into the store
 * @param songStream The continuously generating song data
 * @param store The store the song metadata goes into
 * @param onProgress The callback function which indicates the index
 *                   of the imported song
 * @returns A list of the imported songs
 */
export async function importSongs(
  songStream: AsyncGenerator<Song>,
  store: IMetadataStore,
  onProgress?: (index: number) => void
): Promise<Song[]> {
  const imported: Song[] = [];
  let index = 0;

  try {
    for await (const song of songStream) {
      await store.save(song.id, song);

      imported.push(song);
      index++;
      onProgress?.(index);
    }
  } catch {}

  return imported;
}
