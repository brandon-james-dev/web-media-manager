import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { WIDGET_ATTRIBUTES } from "../widgetAttributes";

/**
 * The active visualizer plugin. `selector` and `settingsButton` add the
 * plugin picker and its settings, `trackInfo` overlays title and artist,
 * and `fallback` decides what shows without a plugin. Minimum 120×80, one
 * per layout.
 *
 * @example
 * ```xml
 * <Tab id="visualizer" titleKey="visualizer.title" icon="@icon/visualizer">
 *   <Visualizer
 *     selector="true"
 *     settingsButton="true"
 *     trackInfo="true"
 *     fallback="artwork"
 *   />
 * </Tab>
 * ```
 * @example
 * ```ts
 * const found = layoutWidgets.filter((n) => n.name === "Visualizer");
 * if (found.length > (LAYOUT_ELEMENTS.Visualizer.perLayout ?? 1)) {
 *   reportSpecMismatch(found[1]);
 * }
 * ```
 *
 * @see [ThemeVisualizer](../../../../components/theme-widgets/playback/Visualizer.tsx)
 */
export const VISUALIZER_ELEMENT: ElementDef = {
  name: "Visualizer",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    selector: { type: ValueType.Boolean },
    settingsButton: { type: ValueType.Boolean },
    trackInfo: { type: ValueType.Boolean },
    fallback: { type: ValueType.Enum, values: ["artwork", "none"] },
    titleText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    detailText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  children: NO_CHILDREN,
  minSize: { width: 120, height: 80 },
  perPage: 1,
  perLayout: 1,
  since: THEME_SPEC_VERSION,
};
