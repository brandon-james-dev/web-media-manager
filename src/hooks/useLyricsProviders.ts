import { useSyncExternalStore } from "react";
import type { LyricsProviderDescriptor } from "@/core/contracts";
import { getLyricsProviderRegistry } from "@/core/ports";

/**
 * Every registered lyrics provider, kept current as plugins are installed or
 * removed.
 *
 * The registry caches its descriptor list, so the snapshot identity only
 * changes when the set does and the picker does not re-render on every read.
 *
 * @example
 * ```tsx
 * const providers = useLyricsProviders();
 * ```
 */
export function useLyricsProviders(): readonly LyricsProviderDescriptor[] {
  const registry = getLyricsProviderRegistry();

  return useSyncExternalStore(
    (onChange) => registry.subscribe(onChange),
    () => registry.listProviders(),
    () => registry.listProviders()
  );
}
