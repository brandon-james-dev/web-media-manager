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
 * A time readout for the current track. Shows `--:--` while the duration
 * is unknown. Minimum 32×12, unlimited per page.
 *
 * @example
 * ```xml
 * <Stack orientation="horizontal" gap="8" align="center">
 *   <PlaybackTime format="elapsed" />
 *   <SeekBar grow="1" slider="@slider/seek" />
 *   <PlaybackTime format="remaining" text="@text/caption" />
 * </Stack>
 * ```
 * @example
 * ```ts
 * const limit = LAYOUT_ELEMENTS.PlaybackTime.perPage;
 * if (limit !== null && limit !== undefined && count > limit) {
 *   reportSpecMismatch(node);
 * }
 * ```
 *
 * @see [ThemePlaybackTime](./PlaybackTime.tsx)
 */
export const PLAYBACK_TIME_ELEMENT: ElementDef = {
  name: "PlaybackTime",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    format: {
      type: ValueType.Enum,
      values: ["elapsed", "total", "remaining", "elapsedAndTotal"],
    },
    text: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  children: NO_CHILDREN,
  minSize: { width: 32, height: 12 },
  perPage: null,
  since: THEME_SPEC_VERSION,
};
