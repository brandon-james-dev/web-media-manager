import { getPlayHistoryStore, getPlaylistStore, getStore } from "@/core/ports";

/**
 * Wipe the library. Open Subsonic equivalent: n/a (destructive reset).
 */
export async function clearLibrary(): Promise<void> {
  await getStore().clearStore();
  await getPlaylistStore().clearStore();
  await getPlayHistoryStore().clearStore();
}
