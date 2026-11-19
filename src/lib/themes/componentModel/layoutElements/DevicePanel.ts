import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { WIDGET_ATTRIBUTES } from "../widgetAttributes";

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
 * @see [ThemeDevicePanel](../../../../components/theme-widgets/library/DevicePanel.tsx)
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
