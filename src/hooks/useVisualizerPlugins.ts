import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { PluginKind, PluginSettingsValues } from "@/core/visualizers";
import { getVisualizerPluginManager } from "@/lib/visualizers";
import { refreshPluginLyricsProviders } from "@/lib/lyrics-providers/plugin/refreshPluginLyricsProviders";
import { refreshPluginSourceStrategies, removeSourcesForPlugin } from "@/lib/sources";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";

/**
 * TanStack Query bindings for the plugin manager.
 *
 * The manager owns storage; these hooks own caching and invalidation. Plugin
 * rows are cheap to list, so the list query is the single source the selector,
 * the manager dialog and the active-plugin fallback all read.
 */
export const visualizerKeys = {
  all: ["visualizers"] as const,
  list: () => [...visualizerKeys.all, "list"] as const,
  detail: (pluginId: string) =>
    [...visualizerKeys.all, "detail", pluginId] as const,
  settings: (pluginId: string) =>
    [...visualizerKeys.all, "settings", pluginId] as const,
  thumbnail: (pluginId: string) =>
    [...visualizerKeys.all, "thumbnail", pluginId] as const,
};

export function useInstalledPlugins() {
  return useQuery({
    queryKey: visualizerKeys.list(),
    queryFn: () => getVisualizerPluginManager().list(),
  });
}

/** A plugin resolved from storage, ready to hand to a runtime host. */
export function useLoadedPlugin(pluginId: string | null) {
  return useQuery({
    queryKey: visualizerKeys.detail(pluginId ?? "none"),
    queryFn: () => getVisualizerPluginManager().load(pluginId as string),
    enabled: pluginId !== null,
    staleTime: Infinity,
  });
}

export function usePluginSettings(pluginId: string | null) {
  return useQuery({
    queryKey: visualizerKeys.settings(pluginId ?? "none"),
    queryFn: () => getVisualizerPluginManager().getSettings(pluginId as string),
    enabled: pluginId !== null,
  });
}

export function useInstallPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      file: File;
      replace?: boolean;
      expectKind?: PluginKind;
    }) =>
      getVisualizerPluginManager().installFromZip(variables.file, {
        replace: variables.replace,
        expectKind: variables.expectKind,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: visualizerKeys.all });
      // A lyrics plugin contributes a provider and a source plugin a source
      // kind, so both registries follow the installed set.
      void refreshPluginLyricsProviders().catch(() => {});
      void refreshPluginSourceStrategies().catch(() => {});
    },
  });
}

export function useRemovePlugin() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (pluginId: string) => {
      await getVisualizerPluginManager().remove(pluginId);
      // A source plugin's sources have no provider left to serve them, so they
      // go with the plugin instead of lingering as unusable rows.
      await removeSourcesForPlugin(pluginId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: visualizerKeys.all });
      // A lyrics plugin contributes a provider and a source plugin a source
      // kind, so both registries follow the installed set.
      void refreshPluginLyricsProviders().catch(() => {});
      void refreshPluginSourceStrategies().catch(() => {});
    },
    onError: (error: Error) => {
      toast.add({
        type: "error",
        title: t("visualizer.removeFailed"),
        description: error.message,
      });
    },
  });
}

export function useSavePluginSettings(pluginId: string | null) {
  // The caller publishes the new values to the cache as the user edits, so a
  // completed write must not write them back: a slower earlier write would
  // otherwise overwrite a newer value.
  return useMutation({
    mutationFn: (values: PluginSettingsValues) =>
      getVisualizerPluginManager().saveSettings(pluginId as string, values),
  });
}

export function useResetPluginSettings(pluginId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      getVisualizerPluginManager().resetSettings(pluginId as string),
    onSuccess: (values) => {
      queryClient.setQueryData(
        visualizerKeys.settings(pluginId ?? "none"),
        values
      );
    },
  });
}

/** Object URL for a plugin's thumbnail, revoked when it changes or unmounts. */
export function usePluginThumbnail(pluginId: string | undefined) {
  const { data } = useQuery({
    queryKey: visualizerKeys.thumbnail(pluginId ?? "none"),
    queryFn: () => getVisualizerPluginManager().getThumbnail(pluginId as string),
    enabled: pluginId !== undefined,
    staleTime: Infinity,
  });
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [data]);

  return url;
}
