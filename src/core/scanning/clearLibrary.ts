import { getPlayHistoryStore, getPlaylistStore, getStore } from "@/core/ports";
import { clearHiddenTracks } from "@/lib/hidden-songs";

/**
 * Wipe the library. Open Subsonic equivalent: n/a (destructive reset).
 *
 * The hidden set goes with it: its entries are keyed by song id, so leaving
 * them behind would keep rows that point at songs which no longer exist.
 */
export async function clearLibrary(): Promise<void> {
  await getStore().clearStore();
  await getPlaylistStore().clearStore();
  await getPlayHistoryStore().clearStore();
  await clearHiddenTracks();
}
