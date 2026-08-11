import type { Song } from "@/models/Song";
import type { IMetadataReader } from "@/lib/metadata-utils";
import { readSongFile } from "./readSongFile";
import { uuidv7 } from "uuidv7";

export async function* readSongFiles(
  handles: FileSystemFileHandle[],
  reader: IMetadataReader
): AsyncGenerator<Song> {
  for (const handle of handles) {
    const file = await handle.getFile();
    const tags = await readSongFile(handle, reader);

    const song: Song = {
      id: tags?.id ?? uuidv7(),
      path: file.name,
      fileHandle: handle,
      title: tags?.title ?? "",
      artist: tags?.artist ?? "",
      album: tags?.album ?? "",
      genre: tags?.genre ?? "",
      comment: tags?.comment ?? "",
      year: tags?.year ?? 0,
      track: tags?.track ?? 0,
      pictures: tags?.pictures,
      coverFront: tags?.coverFront,
      coverBack: tags?.coverBack,
    };

    yield song;
  }
}
