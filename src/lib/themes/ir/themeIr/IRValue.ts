import type { IRBrushValue } from "./IRBrushValue";
import type { IRColor } from "./IRColor";
import type { IRGridTrack } from "./IRGridTrack";
import type { IRRef } from "./IRRef";

/**
 * One compiled attribute value. Thickness and CornerRadius expand to four
 * numbers, colors become {@link IRColor}, and brushes become
 * {@link IRBrushValue}.
 *
 * @example
 * ```xml
 * <PanelStyle id="title-strip" padding="4 10" cornerRadius="6 6 0 0" />
 * ```
 * @example
 * ```ts
 * const padding: IRValue = [4, 10, 4, 10];
 * const cornerRadius: IRValue = [6, 6, 0, 0];
 * ```
 */
export type IRValue =
  | boolean
  | number
  | string
  | string[]
  | number[]
  | IRColor
  | IRBrushValue
  | IRGridTrack[]
  | IRRef;
