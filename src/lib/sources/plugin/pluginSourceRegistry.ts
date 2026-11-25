import type { PluginSourceProviderDescriptor } from "@/core/visualizers";

/** One installed plugin's source provider, as the registry holds it. */
export interface RegisteredPluginSource {
  descriptor: PluginSourceProviderDescriptor;
  pluginId: string;
}

const registered = new Map<string, RegisteredPluginSource>();
const listeners = new Set<() => void>();

/**
 * Installed plugin source providers, keyed by provider id.
 *
 * Kept free of React and Dexie so the web worker can read it: the bulk import
 * job resolves a plugin source's strategy from here. The main thread fills it
 * from the plugin store at boot and after every install or removal.
 *
 * @example
 * ```ts
 * const entry = getPluginSourceProvider("my-catalog");
 * ```
 */
export function getPluginSourceProvider(
  providerId: string
): RegisteredPluginSource | undefined {
  return registered.get(providerId);
}

/** Every registered provider, in install order. */
export function listPluginSourceProviders(): RegisteredPluginSource[] {
  return [...registered.values()];
}

/** Replace the registered set, notifying subscribers when it changed. */
export function setPluginSourceProviders(
  next: readonly RegisteredPluginSource[]
): void {
  const nextIds = new Set(next.map((entry) => entry.descriptor.id));
  let changed = nextIds.size !== registered.size;

  if (!changed) {
    for (const id of nextIds) {
      if (!registered.has(id)) {
        changed = true;
        break;
      }
    }
  }

  registered.clear();
  for (const entry of next) {
    registered.set(entry.descriptor.id, entry);
  }

  if (changed) {
    for (const listener of listeners) {
      listener();
    }
  }
}

/** Subscribe to registry changes; returns the unsubscribe function. */
export function subscribePluginSourceProviders(
  listener: () => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
