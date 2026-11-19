import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { SLIDER_STYLE_PROPERTIES } from "./styleAttributes";

/**
 * One named slider style, shared by `SeekBar` and `VolumeControl` and
 * referenced as `@slider/id`. `thumbImage` is required when
 * `thumb="image"` (`E6016`). Its states are `hover`, `pressed`, `focused`
 * and `disabled`.
 *
 * @example
 * ```xml
 * <SliderStyle id="seek" thickness="4" cornerRadius="2"
 *   track="@slot/progressTrack" fill="@slot/progressFill"
 *   buffer="#ffffff33" thumb="round" thumbSize="12">
 *   <State name="hover" thumbSize="14" />
 * </SliderStyle>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.SliderStyle;
 * def.attributes.thumb.values; // ["none", "round", "image"]
 * ```
 */
export const SLIDER_STYLE_ELEMENT: ElementDef = {
  name: "SliderStyle",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    basedOn: { type: ValueType.Reference, refKinds: [ReferenceKind.Slider] },
    ...SLIDER_STYLE_PROPERTIES,
  },
  children: { min: 0, max: 4, allowed: ["State"] },
  parents: ["SliderStyles"],
  since: THEME_SPEC_VERSION,
};
