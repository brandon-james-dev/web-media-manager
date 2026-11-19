import { ReferenceKind } from "./referenceKind";
import type { AttributeDef } from "./types";
import { ValueType } from "./valueType";

/**
 * The attributes shared by every widget, on top of the common layout
 * attributes. `panel` references a `<PanelStyle>` (`@panel/...`) for the
 * widget's outer chrome. `density` picks the row size (`compact` or
 * `comfortable`); when omitted it defaults from the form factor
 * (`comfortable` on mobile and TV).
 *
 * @example
 * ```xml
 * <TrackList variant="table" density="compact" panel="@panel/content" />
 * ```
 * @example
 * ```ts
 * const attributes = { ...COMMON_ATTRIBUTES, ...WIDGET_ATTRIBUTES };
 * ```
 */
export const WIDGET_ATTRIBUTES = {
  panel: { type: ValueType.Reference, refKinds: [ReferenceKind.Panel] },
  density: { type: ValueType.Enum, values: ["compact", "comfortable"] },
} as const satisfies Readonly<Record<string, AttributeDef>>;
