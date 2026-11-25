import { isSafeMode } from "@/core/themes";
import { safeStorageGet } from "@/lib/persistence/browser/safeStorage";
import type { ColorScheme } from "../../package";
import { mirrorTokens, readThemeMirror } from "../themeMirror";
import { applyColorSchemeClass, getRootTokenApplier } from "./applyThemeTokens";

/** The stored display preference, resolved to a scheme. */
function preferredScheme(): ColorScheme {
  const stored = safeStorageGet("ui-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Applies the mirrored tokens of the active theme before React renders, so
 * the first paint is already themed. It does nothing in safe mode, when no
 * mirror is stored, or when the mirror is stale, and it never throws.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * applyThemeMirrorAtBoot();
 * ```
 */
export function applyThemeMirrorAtBoot(): void {
  try {
    if (isSafeMode(window.location.search)) return;
    const mirror = readThemeMirror(window.localStorage);
    if (mirror === undefined) return;
    const tokens = mirrorTokens(mirror, preferredScheme());
    if (tokens === undefined) return;
    getRootTokenApplier().apply(tokens);
    applyColorSchemeClass(document.documentElement, tokens.scheme);
  } catch {
    return;
  }
}
