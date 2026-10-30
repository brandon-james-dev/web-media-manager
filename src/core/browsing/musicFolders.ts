import { getStore } from "@/core/system";
import { directoryToMusicFolder } from "@/core/contracts";
import type { MusicFolder } from "@/core/contracts";

/**
 * Domain: Browsing.
 * Open Subsonic equivalent: getMusicFolders().
 */
export async function getMusicFolders(): Promise<MusicFolder[]> {
  const store = getStore();
  const dirs = await store.getDirectories();
  return dirs.map(directoryToMusicFolder);
}
