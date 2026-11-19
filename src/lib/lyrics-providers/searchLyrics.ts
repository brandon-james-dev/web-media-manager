import { getLyricsSettingsStore } from "@/core/ports";
import type {
  ILyricsLookupOptions,
  ILyricsQuery,
  ILyricsResult,
} from "./ILyricsService";
import type { LyricsProvider } from "./LyricsProvider";
import { LyricsResolver } from "./LyricsResolver";

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

export async function searchLyrics(
  provider: LyricsProvider,
  query: ILyricsQuery,
  options?: ILyricsLookupOptions
): Promise<ILyricsResult[] | null> {
  const service = LyricsResolver.getService(provider, {
    applicationId: await readApplicationId(),
  });
  return await service.search(query, options);
}
