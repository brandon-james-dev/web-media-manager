import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * Static text: exactly one of `resourceKey` or `literal`. `literal` is for
 * brand marks only, at most 32 characters, never translated, and always
 * raises `I6060` for gallery review. Dynamic text belongs to widgets.
 *
 * @example
 * ```xml
 * <Text resourceKey="library.songs" style="@text/title" />
 * <Text literal="CLASSIC" style="@text/logo" />
 * ```
 * @example
 * ```ts
 * const { resourceKey, literal } = node.attributes;
 * if ((resourceKey === undefined) === (literal === undefined)) {
 *   reportSpecMismatch(node);
 * }
 * ```
 *
 * @see [Text](../../render/layout/browser/elements/Text.tsx)
 */
export const TEXT_ELEMENT: ElementDef = {
  name: "Text",
  category: ElementCategory.Control,
  attributes: {
    ...COMMON_ATTRIBUTES,
    resourceKey: { type: ValueType.ResourceKey },
    literal: { type: ValueType.String, maxLength: 32 },
    style: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  children: NO_CHILDREN,
  since: THEME_SPEC_VERSION,
};
