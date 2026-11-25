import type {
  AlbumMetadataService,
  MetadataProviderDescriptor,
  MetadataService,
  MetadataServiceConfig,
} from "@/core/contracts";

/** Builds a provider's song service for one lookup. */
export type MetadataServiceFactory = (
  config: MetadataServiceConfig
) => MetadataService;

/** Builds a provider's album service, when the provider has one. */
export type AlbumMetadataServiceFactory = (
  config: MetadataServiceConfig
) => AlbumMetadataService;

/**
 * Online metadata provider registry port.
 *
 * The registry is the single place the app asks "which metadata providers
 * exist and how do I search with one". Built-in providers register at
 * bootstrap and installed plugin providers register when the plugin store is
 * read, so a lookup never switches on a provider id.
 *
 * `listProviders()` returns a cached array: the identity only changes when a
 * provider is registered or removed, which is what `useSyncExternalStore`
 * needs to avoid re-rendering on every read.
 *
 * @example
 * ```ts
 * const registry = getMetadataProviderRegistry();
 * const service = registry.getService("itunes");
 * const results = await service?.lookup("kind of blue");
 * ```
 */
export interface MetadataProviderRegistry {
  /** Every registered provider, sorted by display name. */
  listProviders(): readonly MetadataProviderDescriptor[];
  getProvider(id: string): MetadataProviderDescriptor | undefined;
  /** A song service for the provider, or `null` when the id is unknown. */
  getService(
    id: string,
    config?: MetadataServiceConfig
  ): MetadataService | null;
  /** An album service for the provider, or `null` when it has none. */
  getAlbumService(
    id: string,
    config?: MetadataServiceConfig
  ): AlbumMetadataService | null;
  /** Adds a provider, replacing one with the same id. */
  registerProvider(
    descriptor: MetadataProviderDescriptor,
    factory: MetadataServiceFactory,
    albumFactory?: AlbumMetadataServiceFactory
  ): void;
  unregisterProvider(id: string): void;
  /** Notifies on register/unregister; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

let metadataProviderRegistryProvider: (() => MetadataProviderRegistry) | null =
  null;

/**
 * Registers the platform's metadata provider registry during bootstrap.
 *
 * @example
 * ```ts
 * setMetadataProviderRegistryProvider(() => createMetadataProviderRegistry());
 * ```
 */
export function setMetadataProviderRegistryProvider(
  provider: () => MetadataProviderRegistry
): void {
  metadataProviderRegistryProvider = provider;
}

/**
 * Returns the registered metadata provider registry.
 *
 * @example
 * ```ts
 * const providers = getMetadataProviderRegistry().listProviders();
 * ```
 */
export function getMetadataProviderRegistry(): MetadataProviderRegistry {
  if (!metadataProviderRegistryProvider) {
    throw new Error(
      "[core/ports/metadataProviders] No metadata provider registry registered — call setMetadataProviderRegistryProvider() during bootstrap."
    );
  }
  return metadataProviderRegistryProvider();
}
