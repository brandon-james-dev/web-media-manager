import { NO_CHILDREN, THEME_SPEC_VERSION } from "./constants";
import { ElementCategory } from "./elementCategory";
import { PALETTE_SLOTS } from "./paletteSlots";
import { ReferenceKind } from "./referenceKind";
import type { AttributeDef, ElementDef } from "./types";
import { ValueType } from "./valueType";

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
const SHADOW_ATTRIBUTES: Readonly<Record<string, AttributeDef>> = {
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
const BUTTON_STYLE_PROPERTIES: Readonly<Record<string, AttributeDef>> = {
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
const SLIDER_STYLE_PROPERTIES: Readonly<Record<string, AttributeDef>> = {
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
const STYLE_SIZE_ATTRIBUTES: Readonly<Record<string, AttributeDef>> = {
  minWidth: { type: ValueType.Length },
  minHeight: { type: ValueType.Length },
};

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
  /**
   * The document root. Its `spec` must match the manifest (`E3010`). Every
   * section is optional except `Palettes`, each may appear at most once, and
   * they must appear in the order listed (`E4012`).
   *
   * @example
   * ```xml
   * <Theme xmlns="urn:wmm:theme:1" spec="1.0">
   *   <Palettes>...</Palettes>
   *   <Defaults text="@text/body" />
   * </Theme>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Theme;
   * def.attributes.spec.required; // true
   * ```
   */
  Theme: {
    name: "Theme",
    category: ElementCategory.Root,
    attributes: {
      spec: { type: ValueType.String, required: true },
    },
    children: {
      min: 1,
      max: 12,
      allowed: [
        "Colors",
        "Palettes",
        "Metrics",
        "Fonts",
        "TextStyles",
        "Images",
        "Brushes",
        "Shadows",
        "ButtonStyles",
        "SliderStyles",
        "PanelStyles",
        "Defaults",
      ],
    },
    since: THEME_SPEC_VERSION,
  },
  /**
   * The fixed color table. Every `@color/` reference resolves to an entry
   * here.
   *
   * @example
   * ```xml
   * <Colors>
   *   <Color id="navy-900" value="#0b1a3a" />
   * </Colors>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Colors;
   * def.children.allowed; // ["Color"]
   * ```
   */
  Colors: {
    name: "Colors",
    category: ElementCategory.Structure,
    attributes: {},
    children: { min: 0, max: 1000, allowed: ["Color"] },
    parents: ["Theme"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * One named color. `value` may reference another color, and a chain that
   * loops back to itself is an error (`E4011`).
   *
   * @example
   * ```xml
   * <Color id="navy-900" value="#0b1a3a" />
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Color;
   * def.attributes.value.required; // true
   * ```
   */
  Color: {
    name: "Color",
    category: ElementCategory.Structure,
    attributes: {
      id: { type: ValueType.Id, required: true },
      value: { type: ValueType.Color, required: true },
    },
    children: NO_CHILDREN,
    parents: ["Colors"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * The scheme-dependent palettes. A theme declares one palette per scheme
   * listed in the manifest.
   *
   * @example
   * ```xml
   * <Palettes>
   *   <Palette scheme="dark">
   *     <Set slot="background" value="@color/navy-900" />
   *     <Set slot="accent" value="#3d8bff" />
   *   </Palette>
   * </Palettes>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Palettes;
   * def.children.max; // 2
   * ```
   */
  Palettes: {
    name: "Palettes",
    category: ElementCategory.Structure,
    attributes: {},
    children: { min: 1, max: 2, allowed: ["Palette"] },
    parents: ["Theme"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * One scheme's color slots. Two palettes with the same `scheme` are an
   * error (`E6014`), as is a palette missing a required slot.
   *
   * @example
   * ```xml
   * <Palette scheme="dark">
   *   <Set slot="background" value="@color/navy-900" />
   *   <Set slot="accent" value="#3d8bff" />
   * </Palette>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Palette;
   * def.attributes.scheme.values; // ["light", "dark"]
   * ```
   */
  Palette: {
    name: "Palette",
    category: ElementCategory.Structure,
    attributes: {
      scheme: {
        type: ValueType.Enum,
        values: ["light", "dark"],
        required: true,
      },
    },
    children: { min: 1, max: null, allowed: ["Set"] },
    parents: ["Palettes"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * One slot value inside a palette. `slot` must be one of
   * {@link PALETTE_SLOTS}.
   *
   * @example
   * ```xml
   * <Set slot="accent" value="#3d8bff" />
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Set;
   * def.attributes.slot.values === PALETTE_SLOTS; // true
   * ```
   */
  Set: {
    name: "Set",
    category: ElementCategory.Structure,
    attributes: {
      slot: {
        type: ValueType.Enum,
        values: PALETTE_SLOTS,
        required: true,
      },
      value: { type: ValueType.Color, required: true },
    },
    children: NO_CHILDREN,
    parents: ["Palette"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * The named length table. Every `@length/` reference resolves to an entry
   * here.
   *
   * @example
   * ```xml
   * <Metrics>
   *   <Length id="gap-sm" value="4" />
   * </Metrics>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Metrics;
   * def.children.allowed; // ["Length"]
   * ```
   */
  Metrics: {
    name: "Metrics",
    category: ElementCategory.Structure,
    attributes: {},
    children: { min: 0, max: 1000, allowed: ["Length"] },
    parents: ["Theme"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * One named length in CSS pixels.
   *
   * @example
   * ```xml
   * <Length id="gap-sm" value="4" />
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Length;
   * def.attributes.value.type; // ValueType.Length
   * ```
   */
  Length: {
    name: "Length",
    category: ElementCategory.Structure,
    attributes: {
      id: { type: ValueType.Id, required: true },
      value: { type: ValueType.Length, required: true },
    },
    children: NO_CHILDREN,
    parents: ["Metrics"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * The font family table. Every `@font/` reference resolves to an entry
   * here.
   *
   * @example
   * ```xml
   * <Fonts>
   *   <FontFamily id="ui" fallback="sansSerif" />
   * </Fonts>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Fonts;
   * def.children.allowed; // ["FontFamily"]
   * ```
   */
  Fonts: {
    name: "Fonts",
    category: ElementCategory.Structure,
    attributes: {},
    children: { min: 0, max: 1000, allowed: ["FontFamily"] },
    parents: ["Theme"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * One font family with up to 16 faces. A theme holds at most 8 families
   * and a family at most 16 faces (`E6016`). `fallback` picks the host stack
   * used when no face loads.
   *
   * @example
   * ```xml
   * <FontFamily id="ui" fallback="sansSerif">
   *   <Face src="assets/fonts/ui-regular.woff2" weight="400" style="normal" />
   * </FontFamily>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.FontFamily;
   * def.children.max; // 16
   * ```
   */
  FontFamily: {
    name: "FontFamily",
    category: ElementCategory.Structure,
    attributes: {
      id: { type: ValueType.Id, required: true },
      fallback: {
        type: ValueType.Enum,
        values: ["sansSerif", "serif", "monospace", "systemUi"],
        required: true,
      },
    },
    children: { min: 0, max: 16, allowed: ["Face"] },
    parents: ["Fonts"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * One font file in a family. `weight` and `style` pick the face the host
   * uses for a matching text style.
   *
   * @example
   * ```xml
   * <Face src="assets/fonts/ui-regular.woff2" weight="400" style="normal" />
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Face;
   * def.attributes.weight.default; // "400"
   * ```
   */
  Face: {
    name: "Face",
    category: ElementCategory.Structure,
    attributes: {
      src: { type: ValueType.String, required: true },
      weight: {
        type: ValueType.Integer,
        min: 100,
        max: 900,
        default: "400",
      },
      style: {
        type: ValueType.Enum,
        values: ["normal", "italic"],
        default: "normal",
      },
    },
    children: NO_CHILDREN,
    parents: ["FontFamily"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * The named text style table. Every `@text/` reference resolves to an entry
   * here.
   *
   * @example
   * ```xml
   * <TextStyles>
   *   <TextStyle id="caption" basedOn="@text/body" size="11" />
   * </TextStyles>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.TextStyles;
   * def.children.allowed; // ["TextStyle"]
   * ```
   */
  TextStyles: {
    name: "TextStyles",
    category: ElementCategory.Structure,
    attributes: {},
    children: { min: 0, max: 1000, allowed: ["TextStyle"] },
    parents: ["Theme"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * One named text style. `basedOn` must stay acyclic and at most 8 levels
   * deep (`E6013`), and `maxLines` is only allowed with `overflow="wrap"`
   * (`E6016`).
   *
   * @example
   * ```xml
   * <TextStyle id="caption" basedOn="@text/body" size="11"
   *   color="@slot/mutedForeground" />
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.TextStyle;
   * def.attributes.overflow.default; // "truncate"
   * ```
   */
  TextStyle: {
    name: "TextStyle",
    category: ElementCategory.Structure,
    attributes: {
      id: { type: ValueType.Id, required: true },
      basedOn: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
      font: { type: ValueType.Reference, refKinds: [ReferenceKind.Font] },
      size: { type: ValueType.Length, min: 8, max: 96 },
      weight: { type: ValueType.Integer, min: 100, max: 900 },
      italic: { type: ValueType.Boolean },
      color: { type: ValueType.Color },
      lineHeight: { type: ValueType.Number, min: 0.8, max: 3 },
      letterSpacing: { type: ValueType.Integer, min: -4, max: 16 },
      transform: {
        type: ValueType.Enum,
        values: ["none", "uppercase", "lowercase", "capitalize"],
      },
      align: { type: ValueType.Enum, values: ["start", "center", "end"] },
      overflow: {
        type: ValueType.Enum,
        values: ["truncate", "wrap"],
        default: "truncate",
      },
      maxLines: { type: ValueType.Integer, min: 1, max: 10 },
      shadow: { type: ValueType.Reference, refKinds: [ReferenceKind.Shadow] },
    },
    children: NO_CHILDREN,
    parents: ["TextStyles"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * The image asset table. Every `@image/` reference resolves to an entry
   * here.
   *
   * @example
   * ```xml
   * <Images>
   *   <Image id="chrome-frame" src="assets/images/frame.png" />
   * </Images>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Images;
   * def.children.allowed; // ["Image"]
   * ```
   */
  Images: {
    name: "Images",
    category: ElementCategory.Structure,
    attributes: {},
    children: { min: 0, max: 1000, allowed: ["Image"] },
    parents: ["Theme"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * One image asset. `slice` is the nine-slice inset in 1× image pixels, and
   * is required when a brush draws the image with `fit="nineSlice"`.
   *
   * @example
   * ```xml
   * <Image id="chrome-frame" src="assets/images/frame.png" slice="12 12 12 12">
   *   <Variant scale="2" src="assets/images/frame@2x.png" />
   * </Image>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Image;
   * def.children.max; // 2
   * ```
   */
  Image: {
    name: "Image",
    category: ElementCategory.Structure,
    attributes: {
      id: { type: ValueType.Id, required: true },
      src: { type: ValueType.String, required: true },
      slice: { type: ValueType.Thickness },
    },
    children: { min: 0, max: 2, allowed: ["Variant"] },
    parents: ["Images"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * A higher-density copy of the base image. Its dimensions must be exactly
   * `scale` times the base image's (`E5021`).
   *
   * @example
   * ```xml
   * <Variant scale="2" src="assets/images/frame@2x.png" />
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Variant;
   * def.attributes.scale.values; // ["2", "3"]
   * ```
   */
  Variant: {
    name: "Variant",
    category: ElementCategory.Structure,
    attributes: {
      scale: {
        type: ValueType.Enum,
        values: ["2", "3"],
        required: true,
      },
      src: { type: ValueType.String, required: true },
    },
    children: NO_CHILDREN,
    parents: ["Image"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * The brush table. Every `@brush/` reference resolves to one of the three
   * brush elements.
   *
   * @example
   * ```xml
   * <Brushes>
   *   <SolidBrush id="panel" color="@slot/card" />
   * </Brushes>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Brushes;
   * def.children.allowed; // ["SolidBrush", "LinearGradient", "ImageBrush"]
   * ```
   */
  Brushes: {
    name: "Brushes",
    category: ElementCategory.Structure,
    attributes: {},
    children: {
      min: 0,
      max: 1000,
      allowed: ["SolidBrush", "LinearGradient", "ImageBrush"],
    },
    parents: ["Theme"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * A brush that fills with one color.
   *
   * @example
   * ```xml
   * <SolidBrush id="panel" color="@slot/card" />
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.SolidBrush;
   * def.attributes.color.required; // true
   * ```
   */
  SolidBrush: {
    name: "SolidBrush",
    category: ElementCategory.Structure,
    attributes: {
      id: { type: ValueType.Id, required: true },
      color: { type: ValueType.Color, required: true },
    },
    children: NO_CHILDREN,
    parents: ["Brushes"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * A gradient brush with 2 to 8 stops along `angle`, in the CSS convention.
   *
   * @example
   * ```xml
   * <LinearGradient id="chrome-gloss" angle="180">
   *   <Stop offset="0" color="#5f8fe0" />
   *   <Stop offset="1" color="#1c3f94" />
   * </LinearGradient>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.LinearGradient;
   * def.attributes.angle.default; // "180"
   * ```
   */
  LinearGradient: {
    name: "LinearGradient",
    category: ElementCategory.Structure,
    attributes: {
      id: { type: ValueType.Id, required: true },
      angle: {
        type: ValueType.Integer,
        min: 0,
        max: 359,
        default: "180",
      },
    },
    children: { min: 2, max: 8, allowed: ["Stop"] },
    parents: ["Brushes"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * One gradient stop. Offsets must not decrease down the list (`E6016`).
   *
   * @example
   * ```xml
   * <Stop offset="0" color="#5f8fe0" />
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Stop;
   * def.attributes.offset.max; // 1
   * ```
   */
  Stop: {
    name: "Stop",
    category: ElementCategory.Structure,
    attributes: {
      offset: { type: ValueType.Number, min: 0, max: 1, required: true },
      color: { type: ValueType.Color, required: true },
    },
    children: NO_CHILDREN,
    parents: ["LinearGradient"],
    since: THEME_SPEC_VERSION,
  },
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
  ImageBrush: {
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
  },
  /**
   * The shadow table. Every `@shadow/` reference resolves to an entry here.
   *
   * @example
   * ```xml
   * <Shadows>
   *   <Shadow id="raised" x="0" y="2" blur="6" spread="0" color="#00000066" />
   * </Shadows>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Shadows;
   * def.children.allowed; // ["Shadow"]
   * ```
   */
  Shadows: {
    name: "Shadows",
    category: ElementCategory.Structure,
    attributes: {},
    children: { min: 0, max: 1000, allowed: ["Shadow"] },
    parents: ["Theme"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * One named shadow with up to 3 stacked layers. The shadow's own offsets
   * draw the first layer.
   *
   * @example
   * ```xml
   * <Shadow id="raised" x="0" y="2" blur="6" spread="0" color="#00000066" />
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Shadow;
   * def.children.max; // 3
   * ```
   */
  Shadow: {
    name: "Shadow",
    category: ElementCategory.Structure,
    attributes: {
      id: { type: ValueType.Id, required: true },
      ...SHADOW_ATTRIBUTES,
    },
    children: { min: 0, max: 3, allowed: ["Layer"] },
    parents: ["Shadows"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * An extra shadow layer stacked on the shadow that holds it.
   *
   * @example
   * ```xml
   * <Shadow id="raised" x="0" y="2" blur="6" spread="0" color="#00000066">
   *   <Layer x="0" y="8" blur="16" spread="-2" color="#00000040" />
   * </Shadow>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Layer;
   * def.attributes.blur.max; // 64
   * ```
   */
  Layer: {
    name: "Layer",
    category: ElementCategory.Structure,
    attributes: SHADOW_ATTRIBUTES,
    children: NO_CHILDREN,
    parents: ["Shadow"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * The button style table. Every `@button/` reference resolves to an entry
   * here.
   *
   * @example
   * ```xml
   * <ButtonStyles>
   *   <ButtonStyle id="transport" background="@brush/chrome-gloss" />
   * </ButtonStyles>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.ButtonStyles;
   * def.children.allowed; // ["ButtonStyle"]
   * ```
   */
  ButtonStyles: {
    name: "ButtonStyles",
    category: ElementCategory.Structure,
    attributes: {},
    children: { min: 0, max: 1000, allowed: ["ButtonStyle"] },
    parents: ["Theme"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * One named button style. When `image` is set it draws the whole face and
   * `background` and `border` are ignored. Its states are `hover`,
   * `pressed`, `focused`, `disabled`, `selected` and `active`, applied in
   * the precedence `disabled` > `pressed` > `active` > `selected` >
   * `hover` > `focused`. `basedOn` must stay acyclic and at most 8 levels
   * deep (`E6013`).
   *
   * @example
   * ```xml
   * <ButtonStyle id="transport" background="@brush/chrome-gloss"
   *   foreground="#ffffff" border="#0d2766" borderWidth="1"
   *   cornerRadius="16" padding="6" minWidth="32" minHeight="32"
   *   iconSize="16" textStyle="@text/body">
   *   <State name="hover" background="@brush/chrome-gloss-hi" />
   *   <State name="pressed" background="@brush/chrome-gloss-down"
   *     shadow="@shadow/inset" />
   *   <State name="disabled" opacity="0.4" />
   * </ButtonStyle>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.ButtonStyle;
   * def.attributes.iconSize.max; // 64
   * ```
   */
  ButtonStyle: {
    name: "ButtonStyle",
    category: ElementCategory.Structure,
    attributes: {
      id: { type: ValueType.Id, required: true },
      basedOn: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
      ...STYLE_SIZE_ATTRIBUTES,
      ...BUTTON_STYLE_PROPERTIES,
    },
    children: { min: 0, max: null, allowed: ["State"] },
    parents: ["ButtonStyles"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * The slider style table. Every `@slider/` reference resolves to an entry
   * here.
   *
   * @example
   * ```xml
   * <SliderStyles>
   *   <SliderStyle id="seek" thickness="4" thumb="round" />
   * </SliderStyles>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.SliderStyles;
   * def.children.allowed; // ["SliderStyle"]
   * ```
   */
  SliderStyles: {
    name: "SliderStyles",
    category: ElementCategory.Structure,
    attributes: {},
    children: { min: 0, max: 1000, allowed: ["SliderStyle"] },
    parents: ["Theme"],
    since: THEME_SPEC_VERSION,
  },
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
  SliderStyle: {
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
  },
  /**
   * The panel style table. Every `@panel/` reference resolves to an entry
   * here.
   *
   * @example
   * ```xml
   * <PanelStyles>
   *   <PanelStyle id="inset" background="@slot/card" />
   * </PanelStyles>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.PanelStyles;
   * def.children.allowed; // ["PanelStyle"]
   * ```
   */
  PanelStyles: {
    name: "PanelStyles",
    category: ElementCategory.Structure,
    attributes: {},
    children: { min: 0, max: 1000, allowed: ["PanelStyle"] },
    parents: ["Theme"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * One named panel style. `clip` defaults to true when `cornerRadius` is
   * above 0, so it has no static default. `textStyle` is the default for
   * every text descendant.
   *
   * @example
   * ```xml
   * <PanelStyle id="inset" background="@slot/card" border="@slot/border"
   *   borderWidth="1" cornerRadius="4" padding="4" />
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.PanelStyle;
   * def.attributes.clip.type; // ValueType.Boolean
   * ```
   */
  PanelStyle: {
    name: "PanelStyle",
    category: ElementCategory.Structure,
    attributes: {
      id: { type: ValueType.Id, required: true },
      basedOn: { type: ValueType.Reference, refKinds: [ReferenceKind.Panel] },
      background: { type: ValueType.Brush },
      border: { type: ValueType.Color },
      borderWidth: { type: ValueType.Thickness },
      cornerRadius: { type: ValueType.CornerRadius },
      padding: { type: ValueType.Thickness },
      shadow: { type: ValueType.Reference, refKinds: [ReferenceKind.Shadow] },
      clip: { type: ValueType.Boolean },
      textStyle: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    },
    children: NO_CHILDREN,
    parents: ["PanelStyles"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * One static appearance of a button or slider style, applied instantly
   * rather than animated. `value` matches one value of a multi-valued
   * command state, and is only allowed on `active`. Overriding `basedOn`,
   * `minWidth` or `minHeight`, setting a property of the other style kind,
   * or naming a state the style kind does not support is `E6015`.
   *
   * @example
   * ```xml
   * <ButtonStyle id="repeat" basedOn="@button/transport">
   *   <State name="active" value="one" foreground="@slot/accent" />
   * </ButtonStyle>
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.State;
   * def.attributes.name.values; // ["hover", "pressed", ...]
   * ```
   */
  State: {
    name: "State",
    category: ElementCategory.Structure,
    attributes: {
      name: {
        type: ValueType.Enum,
        values: [
          "hover",
          "pressed",
          "focused",
          "disabled",
          "selected",
          "active",
        ],
        required: true,
      },
      value: { type: ValueType.String },
      basedOn: {
        type: ValueType.Reference,
        refKinds: [ReferenceKind.Button, ReferenceKind.Slider],
      },
      ...STYLE_SIZE_ATTRIBUTES,
      ...BUTTON_STYLE_PROPERTIES,
      ...SLIDER_STYLE_PROPERTIES,
    },
    children: NO_CHILDREN,
    parents: ["ButtonStyle", "SliderStyle"],
    since: THEME_SPEC_VERSION,
  },
  /**
   * The style each element kind falls back to when it names none. If absent,
   * the host's palette-derived styles apply.
   *
   * @example
   * ```xml
   * <Defaults button="@button/standard" panel="@panel/plain"
   *   text="@text/body" />
   * ```
   * @example
   * ```ts
   * const def = THEME_ELEMENTS.Defaults;
   * def.attributes.button.refKinds; // ["button"]
   * ```
   */
  Defaults: {
    name: "Defaults",
    category: ElementCategory.Structure,
    attributes: {
      button: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
      panel: { type: ValueType.Reference, refKinds: [ReferenceKind.Panel] },
      text: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    },
    children: NO_CHILDREN,
    parents: ["Theme"],
    since: THEME_SPEC_VERSION,
  },
};
