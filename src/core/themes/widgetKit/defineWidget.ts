import { COMMON_ATTRIBUTES } from "@/lib/themes/componentModel/commonAttributes";
import {
  NO_CHILDREN,
  THEME_SPEC_VERSION,
} from "@/lib/themes/componentModel/constants";
import { ElementCategory } from "@/lib/themes/componentModel/elementCategory";
import type { ChildRule, ElementDef } from "@/lib/themes/componentModel/types";
import { WIDGET_ATTRIBUTES } from "@/lib/themes/componentModel/widgetAttributes";

/**
 * What a widget's `definition.ts` writes: the element name, its own
 * attributes, and its placement and size rules. The category, the shared
 * attribute sets, the child rule and the spec version are filled in by
 * {@link defineWidget}.
 *
 * @example
 * ```xml
 * <Lyrics align="center" text="@text/body" />
 * ```
 * @example
 * ```ts
 * const spec: WidgetSpec = {
 *   name: "Lyrics",
 *   attributes: { align: { type: ValueType.Enum, values: ALIGN_VALUES } },
 *   minSize: { width: 160, height: 80 },
 *   perPage: 1,
 * };
 * ```
 */
export type WidgetSpec = Omit<ElementDef, "category" | "children" | "since"> & {
  readonly children?: ChildRule;
};

/**
 * Builds one widget's {@link ElementDef} from a {@link WidgetSpec}. It stamps
 * the widget category and the spec version, merges the shared attributes
 * under the widget's own, and defaults the child rule to none. Keeping the
 * category and version out of each definition means a widget cannot declare
 * itself as something else or drift from the spec.
 *
 * @example
 * ```xml
 * <DevicePanel storage="true" allowAdd="true" titleText="@text/pane-header" />
 * ```
 * @example
 * ```ts
 * export const DEVICE_PANEL_ELEMENT = defineWidget({
 *   name: "DevicePanel",
 *   attributes: { storage: { type: ValueType.Boolean } },
 *   minSize: { width: 200, height: 80 },
 *   perPage: 1,
 * });
 * ```
 */
export function defineWidget(spec: WidgetSpec): ElementDef {
  const { name, attributes, children, ...rest } = spec;
  return {
    name,
    category: ElementCategory.Widget,
    attributes: { ...COMMON_ATTRIBUTES, ...WIDGET_ATTRIBUTES, ...attributes },
    children: children ?? NO_CHILDREN,
    ...rest,
    since: THEME_SPEC_VERSION,
  };
}
