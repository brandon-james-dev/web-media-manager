import type {
  LyricsProviderDescriptor,
  LyricsServiceConfig,
} from "@/core/contracts";
import type {
  LyricsProviderRegistry,
  LyricsServiceFactory,
} from "@/core/ports/lyricsProviders";

interface Registration {
  descriptor: LyricsProviderDescriptor;
  factory: LyricsServiceFactory;
}

/**
 * In-memory lyrics provider registry.
 *
 * Built-in providers and installed plugin providers both register here, so the
 * lookup and the provider picker read one list. The descriptor snapshot is
 * rebuilt only when the set changes, which keeps `listProviders()` identity
 * stable between renders.
 *
 * @example
 * ```ts
 * const registry = createLyricsProviderRegistry();
 * registry.registerProvider(
 *   { id: "lrclib", name: "LRCLIB", origin: "builtin" },
 *   (config) => new LrcLibLyricsService(config)
 * );
 * ```
 */
export function createLyricsProviderRegistry(): LyricsProviderRegistry {
  const registrations = new Map<string, Registration>();
  const listeners = new Set<() => void>();
  let snapshot: readonly LyricsProviderDescriptor[] = [];

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

    getService(id, config: LyricsServiceConfig = {}) {
      const registration = registrations.get(id);
      return registration ? registration.factory(config) : null;
    },

    registerProvider(descriptor, factory) {
      registrations.set(descriptor.id, { descriptor, factory });
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
