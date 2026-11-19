import { SINGLE_LAYOUT, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * The always-visible part of a layout, with exactly one root element. When
 * the layout declares pages, the Shell must contain exactly one `PageHost`.
 *
 * @example
 * ```xml
 * <Shell>
 *   <DockPanel>
 *     <Panel dock="bottom" height="72" style="@panel/chrome" />
 *     <PageHost dock="fill" />
 *   </DockPanel>
 * </Shell>
 * ```
 * @example
 * ```ts
 * const shell = LAYOUT_ELEMENTS.Shell;
 * shell.parents; // ["Layout"]
 * shell.children; // SINGLE_LAYOUT
 * ```
 *
 * @see [SingleChild](../../render/layout/browser/elements/singleChild.tsx)
 */
export const SHELL_ELEMENT: ElementDef = {
  name: "Shell",
  category: ElementCategory.Structure,
  attributes: {},
  children: SINGLE_LAYOUT,
  parents: ["Layout"],
  since: THEME_SPEC_VERSION,
};
