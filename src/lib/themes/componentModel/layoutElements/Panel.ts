import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { OPTIONAL_LAYOUT, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * A decorated container with zero or one child. `style` names a
 * `@panel/` style, and the inline attributes override single properties of
 * it. A `collapsible` panel starts closed, needs an `id`, and opens with
 * `wmm.ui.togglePanel` (`E6204` when the target is not a collapsible
 * Panel). A `resizable` panel docked to `start` or `end` gets a drag handle
 * on its inner edge. A `hideInFullscreen` panel renders nothing while the
 * document is in full screen.
 *
 * @example
 * ```xml
 * <Panel id="editor-panel" style="@panel/chrome" padding="8" collapsible="true">
 *   <MetadataEditor mode="quick" />
 * </Panel>
 * ```
 * @example
 * ```ts
 * const panel = LAYOUT_ELEMENTS.Panel;
 * panel.attributes.style.refKinds; // [ReferenceKind.Panel]
 * panel.attributes.collapsible.default; // "false"
 * panel.attributes.resizable.default; // "false"
 * panel.attributes.hideInFullscreen.default; // "false"
 * ```
 *
 * @see [Panel](../../render/layout/browser/elements/Panel.tsx)
 */
export const PANEL_ELEMENT: ElementDef = {
  name: "Panel",
  category: ElementCategory.Primitive,
  attributes: {
    ...COMMON_ATTRIBUTES,
    style: { type: ValueType.Reference, refKinds: [ReferenceKind.Panel] },
    background: {
      type: ValueType.Brush,
      refKinds: [ReferenceKind.Brush, ReferenceKind.Slot, ReferenceKind.Color],
    },
    border: {
      type: ValueType.Color,
      refKinds: [ReferenceKind.Color, ReferenceKind.Slot],
    },
    borderWidth: { type: ValueType.Thickness },
    cornerRadius: { type: ValueType.CornerRadius },
    padding: { type: ValueType.Thickness },
    shadow: { type: ValueType.Reference, refKinds: [ReferenceKind.Shadow] },
    collapsible: { type: ValueType.Boolean, default: "false" },
    resizable: { type: ValueType.Boolean, default: "false" },
    /**
     * Whether the panel is left out while the document is in full screen,
     * so chrome such as a tab strip or a transport bar can step aside.
     */
    hideInFullscreen: { type: ValueType.Boolean, default: "false" },
  },
  children: OPTIONAL_LAYOUT,
  since: THEME_SPEC_VERSION,
};
