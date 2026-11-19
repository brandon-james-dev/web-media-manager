import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * A brush that paints an image. `fit="nineSlice"` uses the image's `slice`
 * insets, and `tint` is applied as a multiply blend.
 *
 * @example
 * ```xml
 * <ImageBrush id="frame" image="@image/chrome-frame" fit="nineSlice" />
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.ImageBrush;
 * def.attributes.fit.default; // "stretch"
 * ```
 */
export const IMAGE_BRUSH_ELEMENT: ElementDef = {
  name: "ImageBrush",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    image: {
      type: ValueType.Reference,
      refKinds: [ReferenceKind.Image],
      required: true,
    },
    fit: {
      type: ValueType.Enum,
      values: ["stretch", "cover", "contain", "tile", "nineSlice"],
      default: "stretch",
    },
    tint: { type: ValueType.Color },
  },
  children: NO_CHILDREN,
  parents: ["Brushes"],
  since: THEME_SPEC_VERSION,
};
