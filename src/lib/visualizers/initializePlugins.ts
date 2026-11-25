import { createLyricsProviderRegistry } from "@/core/lyrics";
import { setLyricsProviderRegistryProvider } from "@/core/ports";
import { refreshPluginLyricsProviders } from "@/lib/lyrics-providers/plugin/refreshPluginLyricsProviders";
import { registerBuiltinLyricsProviders } from "@/lib/lyrics-providers/registerBuiltinLyricsProviders";
import { ensureExampleVisualizers } from "./seedExampleVisualizers";

/**
 * Brings the plugin host up after the store providers are registered.
 *
 * Registers the lyrics provider registry and its built-in providers first, so
 * a lookup always has somewhere to resolve a provider from, then seeds the
 * bundled example plugins and reconciles the registry with the installed
 * plugin set. Each later step is isolated: a failure in one leaves the others
 * as they were.
 *
 * @example
 * ```ts
 * void initializePlugins().catch(() => {});
 * ```
 */
export async function initializePlugins(): Promise<void> {
  // Synchronous, before the first await: the registry must exist before any
  // render reads it through `useLyricsProviders`.
  const lyricsProviderRegistry = createLyricsProviderRegistry();
  registerBuiltinLyricsProviders(lyricsProviderRegistry);
  setLyricsProviderRegistryProvider(() => lyricsProviderRegistry);

  try {
    await ensureExampleVisualizers();
  } catch {
    // A failed seed leaves the installed set as it was.
  }

  try {
    await refreshPluginLyricsProviders();
  } catch {
    // A failed refresh leaves the built-in providers registered.
  }
}
