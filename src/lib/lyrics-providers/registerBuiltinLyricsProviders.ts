import type { LyricsProviderRegistry } from "@/core/ports";
import { LyricsProvider } from "./LyricsProvider";
import { LrcLibLyricsService } from "./lrclib/LrcLibLyricsService";

/**
 * Registers the providers that ship with the app.
 *
 * Built-ins go through the same registry as installed plugin providers, so the
 * lookup and the provider picker never special-case one of them.
 *
 * @example
 * ```ts
 * const registry = createLyricsProviderRegistry();
 * registerBuiltinLyricsProviders(registry);
 * ```
 */
export function registerBuiltinLyricsProviders(
  registry: LyricsProviderRegistry
): void {
  registry.registerProvider(
    {
      id: LyricsProvider.LrcLib,
      name: "LRCLIB",
      origin: "builtin",
      hasSettings: true,
    },
    (config) => new LrcLibLyricsService(config)
  );
}
