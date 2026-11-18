import { useMemo, useSyncExternalStore } from "react";
import { activeTheme } from "@/core/themes/activeTheme";
import { useFormFactor } from "../../formFactor/browser/useFormFactor";
import { selectThemedLayout } from "../selectThemedLayout";
import type { ThemedLayoutSelection } from "../selectThemedLayout";

/**
 * The theme layout the app should mount right now, re-computed when the
 * active theme or the form factor changes.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const selection = useThemedLayoutSelection();
 * selection?.formFactor; // "desktop"
 * ```
 */
export function useThemedLayoutSelection(): ThemedLayoutSelection | undefined {
  const snapshot = useSyncExternalStore(
    activeTheme.subscribe,
    activeTheme.getSnapshot
  );
  const formFactor = useFormFactor();

  return useMemo(
    () => selectThemedLayout(snapshot, formFactor),
    [snapshot, formFactor]
  );
}
