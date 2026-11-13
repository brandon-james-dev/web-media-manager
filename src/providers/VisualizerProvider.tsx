import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useInstalledPlugins, visualizerKeys } from "@/hooks/useVisualizerPlugins";
import { VisualizerContext } from "@/hooks/useVisualizer";
import { wmmBus } from "@/events";
import { safeStorageGet, safeStorageSet } from "@/lib/safeStorage";

const ACTIVE_PLUGIN_STORAGE_KEY = "wmm.visualizer.activePluginId";

/**
 * Owns the visualizer query cache and the active plugin selection.
 *
 * Mounted inside PlaybackProvider (the host needs the analyser) and above the
 * routes, so the now-playing view, the selector and the manager dialog all read
 * one selection. The selection is persisted in localStorage: it is a UI
 * preference, not plugin data, and must survive a reload before Dexie opens.
 */
export function VisualizerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <VisualizerStateProvider>{children}</VisualizerStateProvider>
    </QueryClientProvider>
  );
}

function VisualizerStateProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [activePluginId, setActivePluginIdState] = useState<string | null>(() =>
    safeStorageGet(ACTIVE_PLUGIN_STORAGE_KEY) || null
  );
  const [managerOpen, setManagerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: plugins } = useInstalledPlugins();

  // Seeding and other out-of-band installs happen outside the query hooks, so
  // they announce themselves instead of leaving a stale empty list cached.
  useEffect(() => {
    const off = wmmBus.on("wmm.visualizer.pluginsChanged", () => {
      void queryClient.invalidateQueries({ queryKey: visualizerKeys.all });
    });
    return off;
  }, [queryClient]);

  const setActivePluginId = useCallback((pluginId: string | null) => {
    setActivePluginIdState(pluginId);
    safeStorageSet(ACTIVE_PLUGIN_STORAGE_KEY, pluginId ?? "");

    if (pluginId) {
      wmmBus.publish("wmm.visualizer.changed", { pluginId });
    }
  }, []);

  // Fall back to the first installed plugin when the stored selection is gone
  // (removed plugin, first run, or a cleared database).
  useEffect(() => {
    if (!plugins) {
      return;
    }

    if (activePluginId && plugins.some((plugin) => plugin.id === activePluginId)) {
      return;
    }

    setActivePluginId(plugins[0]?.id ?? null);
  }, [plugins, activePluginId, setActivePluginId]);

  useEffect(() => {
    const offSelect = wmmBus.onCommand(
      "wmm.visualizer.select",
      (payload) => {
        if (payload?.pluginId) {
          setActivePluginId(payload.pluginId);
        }
      }
    );
    const offManager = wmmBus.onCommand("wmm.visualizer.openManager", () =>
      setManagerOpen(true)
    );
    const offSettings = wmmBus.onCommand("wmm.visualizer.openSettings", () =>
      setSettingsOpen(true)
    );

    return () => {
      offSelect();
      offManager();
      offSettings();
    };
  }, [setActivePluginId]);

  const value = useMemo(
    () => ({
      activePluginId,
      setActivePluginId,
      managerOpen,
      setManagerOpen,
      settingsOpen,
      setSettingsOpen,
    }),
    [activePluginId, setActivePluginId, managerOpen, settingsOpen]
  );

  return (
    <VisualizerContext.Provider value={value}>
      {children}
    </VisualizerContext.Provider>
  );
}
