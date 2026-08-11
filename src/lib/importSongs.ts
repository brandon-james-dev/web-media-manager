import type { Song } from "@/models/Song";
import type { IMetadataStore } from "./metadata-utils/IMetadataStore";

export async function importSongs(
  songStream: AsyncGenerator<Song>,
  store: IMetadataStore,
  onProgress?: (index: number) => void
): Promise<Song[]> {
  const imported: Song[] = [];
  let index = 0;

  try {
    for await (const song of songStream) {
      await store.saveSong(song.id, song);

      imported.push(song);
      index++;
      onProgress?.(index);
    }
  } catch {}

  return imported;
}
