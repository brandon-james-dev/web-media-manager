import type {
  LyricsLookupOptions,
  LyricsQuery,
  LyricsResult,
} from "@/core/contracts";
import {
  getLyricsProviderRegistry,
  getLyricsSettingsStore,
} from "@/core/ports";

/**
 * Reads the registered application id. Providers that need none keep working
 * when the settings store is not wired (tests, non-browser hosts).
 */
async function readApplicationId(): Promise<string | undefined> {
  try {
    return (await getLyricsSettingsStore().getSettings()).applicationId;
  } catch {
    return undefined;
  }
}

/**
 * Searches one lyrics provider for a track.
 *
 * The provider is resolved through the registry, so a built-in provider and an
 * installed plugin provider are searched the same way. An unknown id throws:
 * the caller picked a provider that is no longer registered.
 *
 * @example
 * ```ts
 * const results = await searchLyrics("lrclib", { title, artist, duration });
 * const best = rankLyricsResults(results ?? [], { title, artist, duration })[0];
 * ```
 */
export async function searchLyrics(
  provider: string,
  query: LyricsQuery,
  options?: LyricsLookupOptions
): Promise<LyricsResult[] | null> {
  const service = getLyricsProviderRegistry().getService(provider, {
    applicationId: await readApplicationId(),
  });

  if (!service) {
    throw new Error(`Unknown lyrics provider "${provider}".`);
  }

  return await service.search(query, options);
}
