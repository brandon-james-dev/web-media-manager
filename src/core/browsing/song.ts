import { getStore } from "@/core/system";
import { songToChild } from "@/core/contracts";
import type { Child } from "@/core/contracts";

/**
 * Domain: Browsing.
 * Open Subsonic equivalent: getSong().
 */
export async function getSong(id: string): Promise<Child | null> {
  const store = getStore();
  const song = await store.get(id);
  return song ? songToChild(song) : null;
}
