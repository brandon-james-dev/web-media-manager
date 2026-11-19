import { SINGLE_LAYOUT, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * Content drawn at the end of a `Tabs` strip, beside the tab buttons. Has
 * exactly one root element and no attributes.
 *
 * @example
 * ```xml
 * <TabStripEnd>
 *   <Button command="wmm.ui.toggleFullscreen" labelKey="common.fullScreen"
 *           icon="@icon/fullscreen" display="icon" />
 * </TabStripEnd>
 * ```
 * @example
 * ```ts
 * LAYOUT_ELEMENTS.TabStripEnd.parents; // ["Tabs"]
 * ```
 *
 * @see [SingleChild](../../render/layout/browser/elements/singleChild.tsx)
 * @see [Tabs](../../render/layout/browser/elements/Tabs.tsx)
 */
export const TAB_STRIP_END_ELEMENT: ElementDef = {
  name: "TabStripEnd",
  category: ElementCategory.Structure,
  attributes: {},
  children: SINGLE_LAYOUT,
  parents: ["Tabs"],
  since: THEME_SPEC_VERSION,
};
