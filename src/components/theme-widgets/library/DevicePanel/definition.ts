import {
  COMMON_ATTRIBUTES,
  ElementCategory,
  NO_CHILDREN,
  ReferenceKind,
  THEME_SPEC_VERSION,
  ValueType,
  WIDGET_ATTRIBUTES,
} from "@/lib/themes/widgetKit";
import type { ElementDef } from "@/lib/themes/widgetKit";

/**
 * Connected devices. `storage` shows the storage bar and `allowAdd` the
 * add-device button. Minimum 200×80, one per page.
 *
 * @example
 * ```xml
 * <DevicePanel
 *   grow="1"
 *   storage="true"
 *   allowAdd="true"
 *   titleText="@text/pane-header"
 * />
 * ```
 * @example
 * ```ts
 * const attr = LAYOUT_ELEMENTS.DevicePanel.attributes.titleText;
 * const ref = parseReference(node.attributes.titleText);
 * if (ref && !attr.refKinds?.includes(ref.kind)) {
 *   reportSpecMismatch(node);
 * }
 * ```
 *
 * @see [ThemeDevicePanel](./DevicePanel.tsx)
 */
export const DEVICE_PANEL_ELEMENT: ElementDef = {
  name: "DevicePanel",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    storage: { type: ValueType.Boolean },
    allowAdd: { type: ValueType.Boolean },
    titleText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  children: NO_CHILDREN,
  minSize: { width: 200, height: 80 },
  perPage: 1,
  since: THEME_SPEC_VERSION,
};
