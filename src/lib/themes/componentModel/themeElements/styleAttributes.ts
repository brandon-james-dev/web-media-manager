import { ReferenceKind } from "../referenceKind";
import type { AttributeDef } from "../types";
import { ValueType } from "../valueType";

/**
 * The offsets and color a shadow layer draws with. `Shadow` and `Layer` both
 * spread it, so a stacked layer repeats the same six attributes.
 *
 * @example
 * ```xml
 * <Shadow id="raised" x="0" y="2" blur="6" spread="0" color="#00000066" />
 * ```
 * @example
 * ```ts
 * const color = SHADOW_ATTRIBUTES.color;
 * ```
 */
export const SHADOW_ATTRIBUTES: Readonly<Record<string, AttributeDef>> = {
  x: { type: ValueType.Integer, min: -32, max: 32, default: "0" },
  y: { type: ValueType.Integer, min: -32, max: 32, default: "0" },
  blur: { type: ValueType.Integer, min: 0, max: 64, default: "0" },
  spread: { type: ValueType.Integer, min: -16, max: 16, default: "0" },
  inset: { type: ValueType.Boolean, default: "false" },
  color: { type: ValueType.Color, required: true },
};

/**
 * The appearance a button style and its states set. `ButtonStyle` and
 * `State` both spread it, so a state repeats the same properties.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" background="@brush/chrome-gloss"
 *   foreground="#ffffff" />
 * ```
 * @example
 * ```ts
 * const background = BUTTON_STYLE_PROPERTIES.background;
 * ```
 */
export const BUTTON_STYLE_PROPERTIES: Readonly<Record<string, AttributeDef>> = {
  background: { type: ValueType.Brush },
  foreground: { type: ValueType.Color },
  border: { type: ValueType.Color },
  borderWidth: { type: ValueType.Thickness },
  cornerRadius: { type: ValueType.CornerRadius },
  padding: { type: ValueType.Thickness },
  iconSize: { type: ValueType.Length, min: 12, max: 64 },
  textStyle: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  shadow: { type: ValueType.Reference, refKinds: [ReferenceKind.Shadow] },
  opacity: { type: ValueType.Number, min: 0.2, max: 1 },
  image: { type: ValueType.Reference, refKinds: [ReferenceKind.Image] },
  iconVisible: { type: ValueType.Boolean },
  iconFill: { type: ValueType.Boolean },
  labelVisible: { type: ValueType.Boolean },
};

/**
 * The appearance a slider style and its states set. `SliderStyle` and
 * `State` both spread it, so a state repeats the same properties.
 *
 * @example
 * ```xml
 * <SliderStyle id="seek" thickness="4" track="@slot/progressTrack"
 *   fill="@slot/progressFill" thumb="round" />
 * ```
 * @example
 * ```ts
 * const thumb = SLIDER_STYLE_PROPERTIES.thumb;
 * ```
 */
export const SLIDER_STYLE_PROPERTIES: Readonly<Record<string, AttributeDef>> = {
  thickness: { type: ValueType.Length, min: 2, max: 24 },
  cornerRadius: { type: ValueType.CornerRadius },
  track: { type: ValueType.Brush },
  fill: { type: ValueType.Brush },
  buffer: { type: ValueType.Brush },
  border: { type: ValueType.Color },
  thumb: { type: ValueType.Enum, values: ["none", "round", "image"] },
  thumbImage: { type: ValueType.Reference, refKinds: [ReferenceKind.Image] },
  thumbSize: { type: ValueType.Length, min: 8, max: 48 },
  opacity: { type: ValueType.Number, min: 0.2, max: 1 },
};

/**
 * The minimum width and height a button style and its states set. Both are
 * spread, so a state repeats the same two attributes.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" minWidth="32" minHeight="32" />
 * ```
 * @example
 * ```ts
 * const minWidth = STYLE_SIZE_ATTRIBUTES.minWidth;
 * ```
 */
export const STYLE_SIZE_ATTRIBUTES: Readonly<Record<string, AttributeDef>> = {
  minWidth: { type: ValueType.Length },
  minHeight: { type: ValueType.Length },
};
