import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { WIDGET_ATTRIBUTES } from "../widgetAttributes";

/**
 * Seek slider with a buffering indicator; seeking sends
 * `wmm.playback.seek`. `variant="edge"` is a thin rule along the parent's
 * top edge with an enlarged touch area, and needs a `Panel` or `Grid` row
 * parent (`W6110`). Buffering is never shown for offline tracks. Minimum
 * bar 80×16, edge 80×2; two per page.
 *
 * @example
 * ```xml
 * <SeekBar grow="1" slider="@slider/seek" />
 * <Panel dock="bottom" style="@panel/mini-player">
 *   <SeekBar variant="edge" buffering="false" />
 * </Panel>
 * ```
 * @example
 * ```ts
 * const def = LAYOUT_ELEMENTS.SeekBar;
 * const key = node.attributes[def.minSizeBy ?? ""] ?? "bar";
 * const min = (def.minSize as Readonly<Record<string, Size>>)[key];
 * ```
 *
 * @see [ThemeSeekBar](../../../../components/theme-widgets/playback/SeekBar.tsx)
 */
export const SEEK_BAR_ELEMENT: ElementDef = {
  name: "SeekBar",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    variant: { type: ValueType.Enum, values: ["bar", "edge"] },
    buffering: { type: ValueType.Boolean, default: "true" },
    slider: { type: ValueType.Reference, refKinds: [ReferenceKind.Slider] },
  },
  children: NO_CHILDREN,
  minSize: {
    bar: { width: 80, height: 16 },
    edge: { width: 80, height: 2 },
  },
  minSizeBy: "variant",
  perPage: 2,
  since: THEME_SPEC_VERSION,
};
