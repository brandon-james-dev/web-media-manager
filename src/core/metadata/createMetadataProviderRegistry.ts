import type {
  MetadataProviderDescriptor,
  MetadataServiceConfig,
} from "@/core/contracts";
import type {
  AlbumMetadataServiceFactory,
  MetadataProviderRegistry,
  MetadataServiceFactory,
} from "@/core/ports/metadataProviders";

interface Registration {
  descriptor: MetadataProviderDescriptor;
  factory: MetadataServiceFactory;
  albumFactory?: AlbumMetadataServiceFactory;
}

/**
 * In-memory online metadata provider registry.
 *
 * Built-in providers and installed plugin providers both register here, so the
 * lookup and the provider picker read one list. The descriptor snapshot is
 * rebuilt only when the set changes, which keeps `listProviders()` identity
 * stable between renders.
 *
 * @example
 * ```ts
 * const registry = createMetadataProviderRegistry();
 * registry.registerProvider(
 *   { id: "itunes", name: "iTunes", origin: "builtin", hasAlbumLookup: true },
 *   () => new ItunesMetadataService(),
 *   () => new ItunesMetadataService()
 * );
 * ```
 */
export function createMetadataProviderRegistry(): MetadataProviderRegistry {
  const registrations = new Map<string, Registration>();
  const listeners = new Set<() => void>();
  let snapshot: readonly MetadataProviderDescriptor[] = [];

  function rebuild(): void {
    snapshot = [...registrations.values()]
      .map((registration) => registration.descriptor)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function emit(): void {
    rebuild();
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    listProviders: () => snapshot,

    getProvider: (id) => registrations.get(id)?.descriptor,

    getService(id, config: MetadataServiceConfig = {}) {
      const registration = registrations.get(id);
      return registration ? registration.factory(config) : null;
    },

    getAlbumService(id, config: MetadataServiceConfig = {}) {
      const registration = registrations.get(id);
      if (!registration?.albumFactory) {
        return null;
      }
      return registration.albumFactory(config);
    },

    registerProvider(descriptor, factory, albumFactory) {
      registrations.set(descriptor.id, { descriptor, factory, albumFactory });
      emit();
    },

    unregisterProvider(id) {
      if (registrations.delete(id)) {
        emit();
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
