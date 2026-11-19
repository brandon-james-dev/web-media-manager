import { SINGLE_LAYOUT, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * One panel of a `Tabs` element, with exactly one root element. `titleKey`
 * labels the tab and `icon` decorates it. The host remembers the selected
 * tab per layout.
 *
 * @example
 * ```xml
 * <Tab id="visualizer" titleKey="visualizer.title" icon="@icon/visualizer">
 *   <Visualizer />
 * </Tab>
 * ```
 * @example
 * ```ts
 * const tab = LAYOUT_ELEMENTS.Tab;
 * tab.parents; // ["Tabs"]
 * tab.attributes.icon.refKinds; // [ReferenceKind.Icon, ReferenceKind.Image]
 * ```
 *
 * @see [SingleChild](../../render/layout/browser/elements/singleChild.tsx)
 * @see [Tabs](../../render/layout/browser/elements/Tabs.tsx)
 */
export const TAB_ELEMENT: ElementDef = {
  name: "Tab",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    titleKey: { type: ValueType.ResourceKey, required: true },
    icon: {
      type: ValueType.Reference,
      refKinds: [ReferenceKind.Icon, ReferenceKind.Image],
    },
  },
  children: SINGLE_LAYOUT,
  parents: ["Tabs"],
  since: THEME_SPEC_VERSION,
};
