import { useSyncExternalStore } from "react";
import {
  PluginSourceStrategy,
  listPluginSourceProviders,
  subscribePluginSourceProviders,
} from "@/lib/sources";
import type { IMusicSourceStrategy } from "@/lib/sources";

let snapshot: IMusicSourceStrategy[] = [];
let snapshotKey = "";

/**
 * Build the strategy list from the registry, rebuilding only when the set of
 * provider ids changed. `useSyncExternalStore` compares the returned array by
 * identity, so a fresh array on every read would re-render forever.
 */
function getSnapshot(): IMusicSourceStrategy[] {
  const providers = listPluginSourceProviders();
  const key = providers.map((entry) => entry.descriptor.id).join("|");
  if (key !== snapshotKey) {
    snapshotKey = key;
    snapshot = providers.map(
      (entry) => new PluginSourceStrategy(entry.descriptor, entry.pluginId)
    );
  }
  return snapshot;
}

/**
 * Strategies contributed by installed source plugins.
 *
 * The add-source picker renders these beside the built-in kinds, so a plugin
 * source is added through the same flow as a local folder or a server.
 *
 * @example
 * ```ts
 * const pluginStrategies = usePluginSourceStrategies();
 * ```
 */
export function usePluginSourceStrategies(): IMusicSourceStrategy[] {
  return useSyncExternalStore(
    subscribePluginSourceProviders,
    getSnapshot,
    getSnapshot
  );
}
