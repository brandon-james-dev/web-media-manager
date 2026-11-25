import { isPluginSourceProvider } from "@/core/plugins";
import { getPluginManager } from "@/lib/plugins/getPluginManager";
import {
  setPluginSourceProviders,
  type RegisteredPluginSource,
} from "./pluginSourceRegistry";

/**
 * Reconciles the plugin source registry with the installed plugins.
 *
 * Called at boot and after every install or removal, so the add-source picker
 * and playback dispatch only ever see providers that are actually installed.
 *
 * @example
 * ```ts
 * await refreshPluginSourceStrategies();
 * ```
 */
export async function refreshPluginSourceStrategies(): Promise<void> {
  const plugins = await getPluginManager().list();
  const next: RegisteredPluginSource[] = [];

  for (const plugin of plugins) {
    if (plugin.kind !== "source") {
      continue;
    }

    const descriptor = plugin.manifest.provider;
    if (!descriptor || !isPluginSourceProvider(descriptor)) {
      continue;
    }

    next.push({ descriptor, pluginId: plugin.id });
  }

  setPluginSourceProviders(next);
}
