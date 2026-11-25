import { getSourcesStore } from "@/core/ports";
import { getStrategyForSource } from "./config";

/**
 * Enqueue a resync (Bulk Import) run for every configured music source.
 *
 * Called once at app startup (after the stores/job service are registered)
 * so local folders and remote servers re-import on each launch — keeping the
 * library in sync with what's on the sources. Each source dispatches through
 * its strategy's `sync()`, which enqueues the bulk-import job with the right
 * payload (config/credentials for remote kinds). Sources whose strategy
 * can't sync (returns null) are skipped. Sources named in
 * `skipSourceIds` (an import was just restored for them) are not synced twice.
 */
export async function resyncAllSources(
  skipSourceIds: ReadonlySet<string> = new Set()
): Promise<void> {
  const sources = await getSourcesStore().getSources();
  for (const source of sources) {
    if (skipSourceIds.has(source.id)) continue;
    const strategy = getStrategyForSource(source);

    // One unreadable source must not abort the whole resync. A Zune that was
    // unplugged throws from `refreshSource` (`NotFoundError: The device was
    // disconnected`), and letting that escape rejected this function, which
    // runs unawaited at boot — so `main.tsx` painted the boot-failure screen
    // over the app and no later source was resynced either.
    try {
      await strategy?.sync?.({ source, silent: true });
    } catch (error) {
      console.warn(
        `[resyncAllSources] Could not resync "${source.name}":`,
        error
      );
    }
  }
}
