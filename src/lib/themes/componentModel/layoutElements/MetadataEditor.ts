import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { WIDGET_ATTRIBUTES } from "../widgetAttributes";

/**
 * Edits the selected songs' tags. `mode="full"` is the docked editor and
 * `quick` is the quick-edit dialog content. It takes text entry, so it is
 * invalid in `tv.xml` (`E6095`), and it belongs on a page rather than in
 * the Shell (`W6094`). Minimum 240×200, one per layout.
 *
 * @example
 * ```xml
 * <MetadataEditor
 *   dock="bottom"
 *   libraryMode="edit"
 *   mode="full"
 *   height="320"
 *   panel="@panel/editor"
 * />
 * ```
 * @example
 * ```ts
 * const editors = layoutWidgets.filter((n) => n.name === "MetadataEditor");
 * if (editors.length > (LAYOUT_ELEMENTS.MetadataEditor.perLayout ?? 1)) {
 *   reportSpecMismatch(editors[1]);
 * }
 * ```
 *
 * @see [ThemeMetadataEditor](../../../../components/theme-widgets/library/MetadataEditor.tsx)
 */
export const METADATA_EDITOR_ELEMENT: ElementDef = {
  name: "MetadataEditor",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    mode: { type: ValueType.Enum, values: ["quick", "full"] },
    labelText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  children: NO_CHILDREN,
  minSize: { width: 240, height: 200 },
  perPage: 1,
  perLayout: 1,
  since: THEME_SPEC_VERSION,
};
