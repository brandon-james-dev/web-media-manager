import { getSourcesStore } from "@/core/ports";
import { musicSourceStrategies } from "./index";

/**
 * Enqueue a resync (Bulk Import) run for every configured music source.
 *
 * Called once at app startup (after the stores/job service are registered)
 * so local folders and remote servers re-import on each launch — keeping the
 * library in sync with what's on the sources. Each source dispatches through
 * its strategy's `sync()`, which enqueues the bulk-import job with the right
 * payload (config/credentials for remote kinds). Sources whose strategy
 * can't sync (returns null) are skipped.
 */
export async function resyncAllSources(): Promise<void> {
  const sources = await getSourcesStore().getSources();
  for (const source of sources) {
    const strategy = musicSourceStrategies.find((s) => s.kind === source.kind);
    strategy?.sync?.({ source, silent: true });
  }
}
