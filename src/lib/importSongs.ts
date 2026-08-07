import type { Song } from "@/models/Song";

export async function importSongs(
  songStream: AsyncGenerator<Song>,
  onProgress?: (index: number) => void
): Promise<Song[]> {
  const imported: Song[] = [];
  let index = 0;

  for await (const song of songStream) {
    imported.push(song);
    index++;
    onProgress?.(index);
  }

  return imported;
}
