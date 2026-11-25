import type {
  LyricsProviderDescriptor,
  LyricsService,
  LyricsServiceConfig,
} from "@/core/contracts";

/** Builds a provider's service for one lookup, with the settings it needs. */
export type LyricsServiceFactory = (
  config: LyricsServiceConfig
) => LyricsService;

/**
 * Lyrics provider registry port.
 *
 * The registry is the single place the app asks "which lyrics providers exist
 * and how do I search with one". Built-in providers register at bootstrap and
 * installed plugin providers register when the plugin store is read, so the
 * lookup never switches on a provider id.
 *
 * `listProviders()` returns a cached array: the identity only changes when a
 * provider is registered or removed, which is what `useSyncExternalStore`
 * needs to avoid re-rendering on every read.
 *
 * @example
 * ```ts
 * const registry = getLyricsProviderRegistry();
 * const service = registry.getService("lrclib", { applicationId });
 * const results = await service?.search({ title, artist });
 * ```
 */
export interface LyricsProviderRegistry {
  /** Every registered provider, sorted by display name. */
  listProviders(): readonly LyricsProviderDescriptor[];
  getProvider(id: string): LyricsProviderDescriptor | undefined;
  /** A service for the provider, or `null` when the id is unknown. */
  getService(
    id: string,
    config?: LyricsServiceConfig
  ): LyricsService | null;
  /** Adds a provider, replacing one with the same id. */
  registerProvider(
    descriptor: LyricsProviderDescriptor,
    factory: LyricsServiceFactory
  ): void;
  unregisterProvider(id: string): void;
  /** Notifies on register/unregister; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

let lyricsProviderRegistryProvider: (() => LyricsProviderRegistry) | null =
  null;

/**
 * Registers the platform's lyrics provider registry during bootstrap.
 *
 * @example
 * ```ts
 * setLyricsProviderRegistryProvider(() => createLyricsProviderRegistry());
 * ```
 */
export function setLyricsProviderRegistryProvider(
  provider: () => LyricsProviderRegistry
): void {
  lyricsProviderRegistryProvider = provider;
}

/**
 * Returns the registered lyrics provider registry.
 *
 * @example
 * ```ts
 * const providers = getLyricsProviderRegistry().listProviders();
 * ```
 */
export function getLyricsProviderRegistry(): LyricsProviderRegistry {
  if (!lyricsProviderRegistryProvider) {
    throw new Error(
      "[core/ports/lyricsProviders] No lyrics provider registry registered — call setLyricsProviderRegistryProvider() during bootstrap."
    );
  }
  return lyricsProviderRegistryProvider();
}
