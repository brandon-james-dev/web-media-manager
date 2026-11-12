import { localSourceFolders } from "@/core/contracts/sources";
import type { MusicSource } from "@/models";

/**
 * What a source reads from: its folders, or its server and library. A change
 * means earlier import times no longer say what is new.
 */
export function sourceFingerprint(source: MusicSource): string {
  if (source.kind === "local") {
    return localSourceFolders(source)
      .map((folder) => folder.name)
      .join("|");
  }
  const { baseUrl, username, musicFolderId } = source.config;
  return [baseUrl, username, musicFolderId].join("|");
}
