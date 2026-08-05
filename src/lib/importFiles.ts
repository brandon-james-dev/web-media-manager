import type { IMetadataReader } from "@/lib/tagreader";
import type { Song } from "@/models/Song";

export async function importFiles(
  files: File[],
  reader: IMetadataReader,
  batchSize: number = 10
): Promise<Song[]> {
  const results: Song[] = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (file) => {
        const valid = await reader.validate(file);
        if (!valid) return null;

        const tags = await reader.readTags(file);
        const props = await reader.readProperties(file);

        return {
          id: file.name,
          path: file.name,
          fileSizeBytes: file.size,
          ...tags,
          ...props,
        } as Song;
      })
    );

    for (const song of batchResults) {
      if (song) results.push(song);
    }
  }

  return results;
}
