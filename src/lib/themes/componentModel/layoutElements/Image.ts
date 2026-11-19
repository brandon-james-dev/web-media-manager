import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * Shows an `@image/` resource. Needs exactly one of `decorative="true"` or
 * `altKey`, which forces an explicit accessibility decision.
 *
 * @example
 * ```xml
 * <Image source="@image/logo" fit="contain" decorative="true" />
 * <Image source="@image/badge" altKey="app.title" />
 * ```
 * @example
 * ```ts
 * const decorative = node.attributes.decorative === "true";
 * if (decorative === (node.attributes.altKey !== undefined)) {
 *   reportSpecMismatch(node);
 * }
 * ```
 *
 * @see [Image](../../render/layout/browser/elements/Image.tsx)
 */
export const IMAGE_ELEMENT: ElementDef = {
  name: "Image",
  category: ElementCategory.Control,
  attributes: {
    ...COMMON_ATTRIBUTES,
    source: {
      type: ValueType.Reference,
      refKinds: [ReferenceKind.Image],
      required: true,
    },
    fit: {
      type: ValueType.Enum,
      values: ["none", "stretch", "cover", "contain", "nineSlice"],
    },
    decorative: { type: ValueType.Boolean },
    altKey: { type: ValueType.ResourceKey },
  },
  children: NO_CHILDREN,
  since: THEME_SPEC_VERSION,
};
