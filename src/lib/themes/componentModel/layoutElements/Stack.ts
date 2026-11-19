import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { ALIGN_VALUES, LAYOUT_LIST, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * Arranges children in a line. `align` is the cross axis, `justify` the
 * main axis, and `wrap` only applies when horizontal. Children may set
 * `grow` to share leftover space.
 *
 * @example
 * ```xml
 * <Stack orientation="horizontal" gap="4" align="center" justify="spaceBetween">
 *   <Text resourceKey="library.songs" style="@text/title" />
 *   <SearchBox grow="1" />
 * </Stack>
 * ```
 * @example
 * ```ts
 * LAYOUT_ELEMENTS.Stack.attributes.orientation.default; // "vertical"
 * ```
 *
 * @see [Stack](../../render/layout/browser/elements/Stack.tsx)
 */
export const STACK_ELEMENT: ElementDef = {
  name: "Stack",
  category: ElementCategory.Primitive,
  attributes: {
    ...COMMON_ATTRIBUTES,
    orientation: {
      type: ValueType.Enum,
      values: ["horizontal", "vertical"],
      default: "vertical",
    },
    gap: { type: ValueType.Length },
    align: { type: ValueType.Enum, values: ALIGN_VALUES },
    justify: {
      type: ValueType.Enum,
      values: ["start", "center", "end", "spaceBetween"],
    },
    overflow: { type: ValueType.Enum, values: ["clip", "scroll"] },
    wrap: { type: ValueType.Boolean },
  },
  children: LAYOUT_LIST,
  since: THEME_SPEC_VERSION,
};
