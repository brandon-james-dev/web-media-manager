import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { getThemeStore } from "@/core/ports";
import type { InstalledTheme } from "@/core/ports";
import { shouldStartThemeTrial, themeTrial } from "@/core/themes";
import type { PendingThemeInstall } from "@/core/themes";
import {
  getThemeManager,
  reloadActiveTheme,
} from "@/lib/themes/getThemeManager";

/**
 * TanStack Query bindings for the theme manager.
 *
 * The manager owns storage; these hooks own caching and invalidation. The
 * installed list and the active id are separate queries so a pick or a trial
 * revert refreshes the selection without reloading every package row.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const { data: themes } = useInstalledThemes();
 * ```
 */
export const themeKeys = {
  all: ["themes"] as const,
  list: () => [...themeKeys.all, "list"] as const,
  active: () => [...themeKeys.all, "active"] as const,
  thumbnail: (themeId: string) =>
    [...themeKeys.all, "thumbnail", themeId] as const,
};

/**
 * Every installed theme package.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const { data: themes } = useInstalledThemes();
 * ```
 */
export function useInstalledThemes() {
  return useQuery({
    queryKey: themeKeys.list(),
    queryFn: () => getThemeManager().listThemes(),
  });
}

/**
 * The stored active theme id, or `null` for the built-in theme. A query cannot
 * resolve to `undefined`, so the built-in theme is `null` here.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const { data: activeThemeId } = useActiveThemeId();
 * ```
 */
export function useActiveThemeId() {
  return useQuery({
    queryKey: themeKeys.active(),
    queryFn: async () => (await getThemeManager().getActiveThemeId()) ?? null,
  });
}

/**
 * Validates a theme ZIP without storing anything, so the install dialog can
 * show the manifest, the change kind and every issue first.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const review = useReviewTheme();
 * review.mutate(file);
 * ```
 */
export function useReviewTheme() {
  return useMutation({
    mutationFn: async (file: File) =>
      getThemeManager().reviewTheme(await file.arrayBuffer()),
  });
}

/**
 * Stores a reviewed package and its files.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const commit = useCommitTheme();
 * commit.mutate(pending);
 * ```
 */
export function useCommitTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pending: PendingThemeInstall) =>
      getThemeManager().commitInstall(pending),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: themeKeys.all });
    },
  });
}

/**
 * Deletes an installed theme and its files. The store clears the active id
 * when the removed theme was active, and a running trial that names the
 * theme ends without reverting.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const remove = useRemoveTheme();
 * remove.mutate("classic-blue");
 * ```
 */
export function useRemoveTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (themeId: string) => {
      const trial = themeTrial.getSnapshot();
      if (trial?.themeId === themeId || trial?.previousId === themeId) {
        themeTrial.keep();
      }
      await getThemeManager().uninstallTheme(themeId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: themeKeys.all });
      void reloadActiveTheme();
    },
  });
}

/**
 * Applies a theme pick: stores the id, refreshes the cache and starts
 * the trial countdown. The revert restores the previous id, or the built-in
 * theme when that theme was uninstalled during the trial.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const applyTheme = useApplyTheme();
 * await applyTheme("classic-blue");
 * ```
 */
export function useApplyTheme() {
  const queryClient = useQueryClient();

  return useCallback(
    async (nextId: string | undefined): Promise<void> => {
      const manager = getThemeManager();
      const previous = await manager.getActiveThemeId();
      if (previous === nextId) return;
      await manager.setActiveThemeId(nextId);
      await queryClient.invalidateQueries({ queryKey: themeKeys.all });
      await reloadActiveTheme();
      const installed = await manager.listThemes();
      if (
        !shouldStartThemeTrial(
          previous,
          nextId,
          installed.map((theme) => theme.id)
        )
      ) {
        themeTrial.keep();
        return;
      }
      themeTrial.start(nextId, previous, async (previousId) => {
        try {
          await manager.setActiveThemeId(previousId);
        } catch {
          await manager.setActiveThemeId(undefined);
        }
        await queryClient.invalidateQueries({ queryKey: themeKeys.all });
        await reloadActiveTheme();
      });
    },
    [queryClient]
  );
}

/**
 * Drops any running trial and returns to the built-in theme.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const reset = useResetTheme();
 * reset.mutate();
 * ```
 */
export function useResetTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      themeTrial.keep();
      await getThemeManager().resetToDefault();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: themeKeys.all });
      void reloadActiveTheme();
    },
  });
}

/**
 * Object URL for a theme's manifest thumbnail, revoked when it changes or
 * unmounts. The query key carries the version, so a reinstalled package
 * refreshes the image.
 *
 * @example
 * ```json
 * { "thumbnail": "previews/thumbnail.png" }
 * ```
 * @example
 * ```ts
 * const url = useThemeThumbnail(theme);
 * ```
 */
export function useThemeThumbnail(theme: InstalledTheme | undefined) {
  const thumbnail = theme?.manifest.thumbnail;
  const { data } = useQuery({
    queryKey: themeKeys.thumbnail(
      theme === undefined ? "none" : `${theme.id}@${theme.version}`
    ),
    queryFn: async () => {
      const file = await getThemeStore().files.getFile(
        theme?.id as string,
        thumbnail as string
      );
      return file === undefined
        ? undefined
        : new Blob([file.bytes.slice().buffer as ArrayBuffer], {
            type: file.mimeType,
          });
    },
    enabled: theme !== undefined && thumbnail !== undefined,
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
