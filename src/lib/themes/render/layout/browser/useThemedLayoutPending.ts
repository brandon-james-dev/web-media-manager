import { useSyncExternalStore } from "react";
import { activeTheme } from "@/core/themes/activeTheme";
import { isSafeMode } from "@/core/themes";
import { readThemeMirror } from "../../../runtime";
import type { ThemeMirror } from "../../../runtime";
import { useFormFactor } from "../../formFactor/browser/useFormFactor";
import { isThemedLayoutPending } from "../selectThemedLayout";

let bootMirror: { value: ThemeMirror | undefined } | undefined;

/**
 * The mirror as it was when the page loaded, read once. Safe mode ignores it,
 * matching the boot token pass.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * readBootMirror()?.themeId; // "glass-player"
 * ```
 */
function readBootMirror(): ThemeMirror | undefined {
  if (bootMirror === undefined) {
    let value: ThemeMirror | undefined;
    try {
      value = isSafeMode(window.location.search)
        ? undefined
        : readThemeMirror(window.localStorage);
    } catch {
      value = undefined;
    }
    bootMirror = { value };
  }
  return bootMirror.value;
}

/**
 * Whether the app should hide the built-in UI while the active theme loads,
 * so a themed layout does not open with a flash of the default screens.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```tsx
 * const pending = useThemedLayoutPending();
 * return pending ? <div className="h-full w-full" /> : <MainLayout />;
 * ```
 */
export function useThemedLayoutPending(): boolean {
  const snapshot = useSyncExternalStore(
    activeTheme.subscribe,
    activeTheme.getSnapshot
  );
  const formFactor = useFormFactor();
  return isThemedLayoutPending(snapshot, readBootMirror(), formFactor);
}
