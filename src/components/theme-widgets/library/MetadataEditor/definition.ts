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
 * @see [ThemeMetadataEditor](./MetadataEditor.tsx)
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
