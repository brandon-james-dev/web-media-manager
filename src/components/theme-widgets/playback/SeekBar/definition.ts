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
 * @see [ThemeSeekBar](./SeekBar.tsx)
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
