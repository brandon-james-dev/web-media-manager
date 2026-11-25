import { getLyricsProviderRegistry } from "@/core/ports";
import { getVisualizerPluginManager } from "../../visualizers/getPluginManager";
import { PluginLyricsService } from "./PluginLyricsService";

/** Provider ids this module registered, so a removed plugin is unregistered. */
const registered = new Set<string>();

/**
 * Reconciles the registry with the installed lyrics plugins.
 *
 * Called at boot and after every install or removal. A plugin provider never
 * shadows a built-in id, and a plugin that is gone from the store is dropped
 * from the registry, so the picker always matches what is installed.
 *
 * @example
 * ```ts
 * await refreshPluginLyricsProviders();
 * ```
 */
export async function refreshPluginLyricsProviders(): Promise<void> {
  const registry = getLyricsProviderRegistry();
  const plugins = await getVisualizerPluginManager().list();
  const next = new Set<string>();

  for (const plugin of plugins) {
    if (plugin.kind !== "lyrics") {
      continue;
    }

    const descriptor = plugin.manifest.provider;
    if (!descriptor) {
      continue;
    }

    // A built-in keeps its id: a plugin may not replace a provider the app
    // ships with.
    if (registry.getProvider(descriptor.id)?.origin === "builtin") {
      continue;
    }

    registry.registerProvider(
      {
        id: descriptor.id,
        name: descriptor.name,
        origin: "plugin",
        pluginId: plugin.id,
      },
      () => new PluginLyricsService(descriptor)
    );
    next.add(descriptor.id);
  }

  for (const id of registered) {
    if (!next.has(id)) {
      registry.unregisterProvider(id);
    }
  }

  registered.clear();
  for (const id of next) {
    registered.add(id);
  }
}
