import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * The slot inside the Shell where the current page renders. Takes only the
 * common layout attributes and has no children.
 *
 * @example
 * ```xml
 * <PageHost dock="fill" margin="8" />
 * ```
 * @example
 * ```ts
 * const hosts = shellDescendants.filter((node) => node.name === "PageHost");
 * if (hosts.length > 1 || (pages.length > 0 && hosts.length === 0)) {
 *   reportSpecMismatch(shell);
 * }
 * ```
 *
 * @see [PageHost](../../render/layout/browser/elements/PageHost.tsx)
 */
export const PAGE_HOST_ELEMENT: ElementDef = {
  name: "PageHost",
  category: ElementCategory.Structure,
  attributes: { ...COMMON_ATTRIBUTES },
  children: NO_CHILDREN,
  since: THEME_SPEC_VERSION,
};
