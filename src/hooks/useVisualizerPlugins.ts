import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { PluginSettingsValues } from "@/core/visualizers";
import { getVisualizerPluginManager } from "@/lib/visualizers";

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
    mutationFn: (variables: { file: File; replace?: boolean }) =>
      getVisualizerPluginManager().installFromZip(variables.file, {
        replace: variables.replace,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: visualizerKeys.all });
    },
  });
}

export function useRemovePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pluginId: string) =>
      getVisualizerPluginManager().remove(pluginId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: visualizerKeys.all });
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
