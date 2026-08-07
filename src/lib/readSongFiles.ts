import type { Song } from "@/models/Song";
import type { IMetadataReader } from "@/lib/metadata-utils";

export async function* readSongFiles(
  handles: FileSystemFileHandle[],
  reader: IMetadataReader
): AsyncGenerator<Song> {
  for (const handle of handles) {
    const file = await handle.getFile();
    const tags = await reader.readTags(file);

    const song: Song = {
      id: crypto.randomUUID(),
      path: file.name,
      fileHandle: handle,
      title: tags?.title ?? "",
      artist: tags?.artist ?? "",
      album: tags?.album ?? "",
      genre: tags?.genre ?? "",
      comment: tags?.comment ?? "",
      year: tags?.year ?? 0,
      track: tags?.track ?? 0,
    };

    yield song;
  }
}
