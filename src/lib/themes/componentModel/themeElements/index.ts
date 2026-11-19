import { THEME_ELEMENT } from "./Theme";
import { COLORS_ELEMENT } from "./Colors";
import { COLOR_ELEMENT } from "./Color";
import { PALETTES_ELEMENT } from "./Palettes";
import { PALETTE_ELEMENT } from "./Palette";
import { SET_ELEMENT } from "./Set";
import { METRICS_ELEMENT } from "./Metrics";
import { LENGTH_ELEMENT } from "./Length";
import { FONTS_ELEMENT } from "./Fonts";
import { FONT_FAMILY_ELEMENT } from "./FontFamily";
import { FACE_ELEMENT } from "./Face";
import { TEXT_STYLES_ELEMENT } from "./TextStyles";
import { TEXT_STYLE_ELEMENT } from "./TextStyle";
import { IMAGES_ELEMENT } from "./Images";
import { IMAGE_ELEMENT } from "./Image";
import { VARIANT_ELEMENT } from "./Variant";
import { BRUSHES_ELEMENT } from "./Brushes";
import { SOLID_BRUSH_ELEMENT } from "./SolidBrush";
import { LINEAR_GRADIENT_ELEMENT } from "./LinearGradient";
import { STOP_ELEMENT } from "./Stop";
import { IMAGE_BRUSH_ELEMENT } from "./ImageBrush";
import { SHADOWS_ELEMENT } from "./Shadows";
import { SHADOW_ELEMENT } from "./Shadow";
import { LAYER_ELEMENT } from "./Layer";
import { BUTTON_STYLES_ELEMENT } from "./ButtonStyles";
import { BUTTON_STYLE_ELEMENT } from "./ButtonStyle";
import { SLIDER_STYLES_ELEMENT } from "./SliderStyles";
import { SLIDER_STYLE_ELEMENT } from "./SliderStyle";
import { PANEL_STYLES_ELEMENT } from "./PanelStyles";
import { PANEL_STYLE_ELEMENT } from "./PanelStyle";
import { STATE_ELEMENT } from "./State";
import { DEFAULTS_ELEMENT } from "./Defaults";
import type { ElementDef } from "../types";

/**
 * Every element a v1 `theme.xml` may contain, keyed by its exact XML element
 * name. The `Theme` root comes first, then each section followed by the
 * declarations it holds.
 *
 * @example
 * ```xml
 * <Colors>
 *   <Color id="navy-900" value="#0b1a3a" />
 * </Colors>
 * <Metrics>
 *   <Length id="gap-sm" value="4" />
 * </Metrics>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Color;
 * if (def.attributes.value.type !== ValueType.Color) {
 *   reportBadValueType(def);
 * }
 * ```
 */
export const THEME_ELEMENTS: Readonly<Record<string, ElementDef>> = {
  Theme: THEME_ELEMENT,
  Colors: COLORS_ELEMENT,
  Color: COLOR_ELEMENT,
  Palettes: PALETTES_ELEMENT,
  Palette: PALETTE_ELEMENT,
  Set: SET_ELEMENT,
  Metrics: METRICS_ELEMENT,
  Length: LENGTH_ELEMENT,
  Fonts: FONTS_ELEMENT,
  FontFamily: FONT_FAMILY_ELEMENT,
  Face: FACE_ELEMENT,
  TextStyles: TEXT_STYLES_ELEMENT,
  TextStyle: TEXT_STYLE_ELEMENT,
  Images: IMAGES_ELEMENT,
  Image: IMAGE_ELEMENT,
  Variant: VARIANT_ELEMENT,
  Brushes: BRUSHES_ELEMENT,
  SolidBrush: SOLID_BRUSH_ELEMENT,
  LinearGradient: LINEAR_GRADIENT_ELEMENT,
  Stop: STOP_ELEMENT,
  ImageBrush: IMAGE_BRUSH_ELEMENT,
  Shadows: SHADOWS_ELEMENT,
  Shadow: SHADOW_ELEMENT,
  Layer: LAYER_ELEMENT,
  ButtonStyles: BUTTON_STYLES_ELEMENT,
  ButtonStyle: BUTTON_STYLE_ELEMENT,
  SliderStyles: SLIDER_STYLES_ELEMENT,
  SliderStyle: SLIDER_STYLE_ELEMENT,
  PanelStyles: PANEL_STYLES_ELEMENT,
  PanelStyle: PANEL_STYLE_ELEMENT,
  State: STATE_ELEMENT,
  Defaults: DEFAULTS_ELEMENT,
};
