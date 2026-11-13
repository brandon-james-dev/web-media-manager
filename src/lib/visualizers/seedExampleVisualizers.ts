import { safeStorageGet, safeStorageSet } from "@/lib/safeStorage";
import { wmmBus } from "@/events";
import { getVisualizerPluginManager } from "./getPluginManager";

const SEEDED_KEY = "wmm.visualizer.exampleSeeded.aurora";
const LEGACY_SEEDED_KEY = "wmm.visualizer.exampleSeeded";
const EXAMPLE_PLUGIN_ID = "aurora";
const LEGACY_PLUGIN_ID = "particles";
/** Must match `examples/visualizers/aurora/manifest.json`. */
const EXAMPLE_PLUGIN_VERSION = "0.1.1";

/**
 * Installs the bundled aurora visualizer on first run.
 *
 * Seeding is attempted once per browser: a user who removes the example keeps
 * it removed, and a failed fetch (offline, missing asset) does not retry on
 * every launch. The plugin itself is a normal ZIP install, so it goes through
 * the same validation and storage path as any third-party plugin.
 *
 * The earlier particle example was seeded by us, never chosen by the user, so
 * it is removed here when the legacy seed flag proves we installed it.
 */
export async function ensureExampleVisualizers(): Promise<void> {
  const manager = getVisualizerPluginManager();

  if (safeStorageGet(LEGACY_SEEDED_KEY)) {
    const installed = await manager.list();
    if (installed.some((plugin) => plugin.id === LEGACY_PLUGIN_ID)) {
      await manager.remove(LEGACY_PLUGIN_ID);
    }
    safeStorageSet(LEGACY_SEEDED_KEY, "");
  }

  if (safeStorageGet(SEEDED_KEY) === EXAMPLE_PLUGIN_VERSION) {
    return;
  }

  const installed = await manager.list();
  const existing = installed.find(
    (plugin) => plugin.id === EXAMPLE_PLUGIN_ID
  );
  if (existing?.version === EXAMPLE_PLUGIN_VERSION) {
    safeStorageSet(SEEDED_KEY, EXAMPLE_PLUGIN_VERSION);
    return;
  }

  const response = await fetch(
    `${import.meta.env.BASE_URL}plugins/${EXAMPLE_PLUGIN_ID}.zip`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    return;
  }

  const blob = await response.blob();
  await manager.installFromZip(
    new File([blob], `${EXAMPLE_PLUGIN_ID}.zip`, { type: "application/zip" }),
    { replace: true }
  );
  safeStorageSet(SEEDED_KEY, EXAMPLE_PLUGIN_VERSION);
  wmmBus.publish("wmm.visualizer.pluginsChanged", undefined);
}
