import type { Song } from "@/models/Song";
import type { IMetadataReader } from "@/lib/metadata-utils";
import { readSongFile } from "./readSongFile";

/**
 * Reads metadata from a list of FileSystemFileHandles.
 * This function:
 *  - converts each handle into a File
 *  - passes the File to TagLib via readSongFile
 *  - yields a fully constructed Song object
 */
export async function* readSongFiles(
  handles: FileSystemFileHandle[],
  reader: IMetadataReader
): AsyncGenerator<Song> {
  for (const handle of handles) {
    const metadata = await readSongFile(handle, reader);

    const song: Song = {
      id: handle.name,
      filename: handle.name,
      relativePath: handle.name,
      coverFront: metadata?.coverFront,
      coverBack: metadata?.coverBack,
      title: metadata?.title ?? "",
      artist: metadata?.artist ?? "",
      album: metadata?.album ?? "",
      genre: metadata?.genre ?? "",
      comment: metadata?.comment ?? "",
      year: metadata?.year ?? 0,
      track: metadata?.track ?? 0,
      pictures: metadata?.pictures,
      ...metadata,
    };

    yield song;
  }
}
