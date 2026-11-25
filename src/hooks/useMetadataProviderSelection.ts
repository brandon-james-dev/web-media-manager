import { useCallback, useEffect, useState } from "react";
import type { MetadataProviderDescriptor } from "@/core/contracts";
import {
  safeStorageGet,
  safeStorageSet,
} from "@/lib/persistence/browser/safeStorage";

/** Where the last used provider id is kept across sessions. */
const STORAGE_KEY = "wmm.metadataProvider";

/**
 * The online metadata provider the user last searched with.
 *
 * The choice is remembered across sessions, because a user who prefers one
 * provider should not re-pick it every time the panel opens. A plugin provider
 * can disappear underneath that choice — uninstalling the plugin removes it
 * from the registry — so a stored id that is no longer registered falls back to
 * the first available provider instead of leaving the picker on a provider that
 * cannot answer.
 *
 * @example
 * ```tsx
 * const [provider, setProvider] = useMetadataProviderSelection(providers, "itunes");
 * ```
 */
export function useMetadataProviderSelection(
  providers: readonly MetadataProviderDescriptor[],
  fallback: string
): [string, (id: string) => void] {
  const [provider, setProvider] = useState<string>(
    () => safeStorageGet(STORAGE_KEY) ?? fallback
  );

  useEffect(() => {
    if (providers.length === 0) {
      return;
    }
    if (providers.some((entry) => entry.id === provider)) {
      return;
    }

    const next = providers[0]?.id ?? fallback;
    setProvider(next);
    safeStorageSet(STORAGE_KEY, next);
  }, [providers, provider, fallback]);

  const select = useCallback((id: string) => {
    setProvider(id);
    safeStorageSet(STORAGE_KEY, id);
  }, []);

  return [provider, select];
}
