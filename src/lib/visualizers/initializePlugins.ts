import { createLyricsProviderRegistry } from "@/core/lyrics";
import { createMetadataProviderRegistry } from "@/core/metadata";
import {
  setLyricsProviderRegistryProvider,
  setMetadataProviderRegistryProvider,
} from "@/core/ports";
import { refreshPluginLyricsProviders } from "@/lib/lyrics-providers/plugin/refreshPluginLyricsProviders";
import { registerBuiltinLyricsProviders } from "@/lib/lyrics-providers/registerBuiltinLyricsProviders";
import { refreshPluginMetadataProviders } from "@/lib/metadata-providers/plugin/refreshPluginMetadataProviders";
import { registerBuiltinMetadataProviders } from "@/lib/metadata-providers/registerBuiltinMetadataProviders";
import { refreshPluginSourceStrategies } from "@/lib/sources";
import { ensureExampleVisualizers } from "./seedExampleVisualizers";

/**
 * Brings the plugin host up after the store providers are registered.
 *
 * Registers the lyrics provider registry and its built-in providers first, so
 * a lookup always has somewhere to resolve a provider from, then seeds the
 * bundled example plugins and reconciles the lyrics and source registries with
 * the installed plugin set. Each later step is isolated: a failure in one
 * leaves the others as they were.
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

  const metadataProviderRegistry = createMetadataProviderRegistry();
  registerBuiltinMetadataProviders(metadataProviderRegistry);
  setMetadataProviderRegistryProvider(() => metadataProviderRegistry);

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

  try {
    await refreshPluginMetadataProviders();
  } catch {
    // A failed refresh leaves the built-in providers registered.
  }

  try {
    await refreshPluginSourceStrategies();
  } catch {
    // A failed refresh leaves the built-in source kinds addable.
  }
}
