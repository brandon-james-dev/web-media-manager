import { getMetadataProviderRegistry } from "@/core/ports";
import { isPluginMetadataProvider } from "@/core/visualizers";
import { getVisualizerPluginManager } from "../../visualizers/getPluginManager";
import { PluginMetadataService } from "./PluginMetadataService";

/** Provider ids this module registered, so a removed plugin is unregistered. */
const registered = new Set<string>();

/**
 * Reconciles the registry with the installed metadata plugins.
 *
 * Called at boot and after every install or removal. A plugin provider never
 * shadows a built-in id, and a plugin that is gone from the store is dropped
 * from the registry, so the picker always matches what is installed.
 *
 * @example
 * ```ts
 * await refreshPluginMetadataProviders();
 * ```
 */
export async function refreshPluginMetadataProviders(): Promise<void> {
  const registry = getMetadataProviderRegistry();
  const plugins = await getVisualizerPluginManager().list();
  const next = new Set<string>();

  for (const plugin of plugins) {
    if (plugin.kind !== "metadata") {
      continue;
    }

    const descriptor = plugin.manifest.provider;
    if (!descriptor || !isPluginMetadataProvider(descriptor)) {
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
        hasAlbumLookup: false,
      },
      () => new PluginMetadataService(descriptor, plugin.id)
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
