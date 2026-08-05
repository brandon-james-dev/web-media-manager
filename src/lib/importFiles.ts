import type { IMetadataReader } from "./tagreader";
import type { Song } from "@/models/Song";

interface ImportProgressCallbacks {
  onBatchStart?: (batchIndex: number, batchCount: number) => void;
  onFileComplete?: (
    fileIndex: number,
    totalFiles: number,
    result: Song | null
  ) => void;
}

export async function importFiles(
  files: File[],
  reader: IMetadataReader,
  batchSize: number = 10,
  callbacks: ImportProgressCallbacks = {}
): Promise<Song[]> {
  const results: Song[] = [];
  const totalFiles = files.length;
  const batchCount = Math.ceil(totalFiles / batchSize);

  for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
    const start = batchIndex * batchSize;
    const batch = files.slice(start, start + batchSize);

    callbacks.onBatchStart?.(batchIndex, batchCount);

    const batchResults = await Promise.all(
      batch.map(async (file, i) => {
        const globalIndex = start + i;

        const valid = await reader.validate(file);
        if (!valid) {
          callbacks.onFileComplete?.(globalIndex, totalFiles, null);
          return null;
        }

        const tags = await reader.readTags(file);
        const props = await reader.readProperties(file);

        const song: Song = {
          id: file.name,
          path: file.name,
          fileSizeBytes: file.size,
          ...tags,
          ...props,
        };

        callbacks.onFileComplete?.(globalIndex, totalFiles, song);
        return song;
      })
    );

    for (const song of batchResults) {
      if (song) results.push(song);
    }
  }

  return results;
}
