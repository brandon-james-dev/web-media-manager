import type { ActiveThemeSnapshot } from "@/core/themes/activeTheme";
import type { FormFactor } from "../../componentModel";
import type { ThemeIR } from "../../ir";

/**
 * The theme layout the app should mount: the active theme, its compiled IR
 * and the form factor it has a layout for.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const selection: ThemedLayoutSelection = {
 *   themeId: "classic-blue",
 *   ir,
 *   formFactor: "desktop",
 * };
 * ```
 */
export interface ThemedLayoutSelection {
  /** The installed theme's id. */
  readonly themeId: string;
  /** The installed theme's compiled IR. */
  readonly ir: ThemeIR;
  /** The form factor the theme has a layout for. */
  readonly formFactor: FormFactor;
}

/**
 * Picks the layout to mount for the active theme and one form factor. It
 * returns `undefined` while the theme is still loading, when no theme is
 * active, and when the theme has no layout for that form factor; the built-in
 * UI shows in those cases and the theme's tokens still apply.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="mobile" />
 * ```
 * @example
 * ```ts
 * const selection = selectThemedLayout(activeTheme.getSnapshot(), "desktop");
 * selection?.themeId; // "classic-blue"
 * ```
 */
export function selectThemedLayout(
  snapshot: ActiveThemeSnapshot,
  formFactor: FormFactor
): ThemedLayoutSelection | undefined {
  if (!snapshot.loaded) return undefined;
  const theme = snapshot.theme;
  if (theme === undefined) return undefined;
  if (theme.ir.layouts[formFactor] === undefined) return undefined;
  return { themeId: theme.id, ir: theme.ir, formFactor };
}
