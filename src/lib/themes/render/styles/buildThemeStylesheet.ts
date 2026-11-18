import type { FormFactor } from "../../componentModel";
import type {
  IRBrushValue,
  IRColor,
  IRNode,
  IRRef,
  IRStyle,
  IRStyleState,
  IRValue,
  ThemeIR,
} from "../../ir";
import { PALETTE_VARIABLES } from "../../runtime";
import {
  cssImage,
  serializeBrush,
  serializeColor,
  serializeCornerRadius,
  serializeLength,
  serializeShadow,
  serializeTextStyle,
  serializeThickness,
} from "./serializeValues";
import { themeClassName } from "./styleClassNames";
import type {
  BuildThemeStylesheetOptions,
  ThemeImageResolver,
  ThemeStylesheet,
} from "./types";

/**
 * The class the host uses when a theme sets no default button style.
 *
 * @example
 * ```xml
 * <Defaults panel="@panel/content" />
 * ```
 * @example
 * ```ts
 * BUILTIN_BUTTON_CLASS; // "wmm-builtin-button"
 * ```
 */
const BUILTIN_BUTTON_CLASS = "wmm-builtin-button";

/**
 * The class the host uses when a theme sets no default panel style.
 *
 * @example
 * ```xml
 * <Defaults button="@button/standard" />
 * ```
 * @example
 * ```ts
 * BUILTIN_PANEL_CLASS; // "wmm-builtin-panel"
 * ```
 */
const BUILTIN_PANEL_CLASS = "wmm-builtin-panel";

/**
 * The class the host uses when a theme sets no default text style.
 *
 * @example
 * ```xml
 * <Defaults button="@button/standard" panel="@panel/content" />
 * ```
 * @example
 * ```ts
 * BUILTIN_TEXT_CLASS; // "wmm-builtin-text"
 * ```
 */
const BUILTIN_TEXT_CLASS = "wmm-builtin-text";

/**
 * The state stages in ascending precedence. Rules are emitted stage by stage
 * so equal-specificity source order encodes the precedence the spec defines.
 *
 * @example
 * ```xml
 * <State name="pressed" background="@brush/chrome-gloss-down" />
 * ```
 * @example
 * ```ts
 * STATE_STAGES.at(-1); // "disabled"
 * ```
 */
const STATE_STAGES = [
  "focused",
  "hover",
  "selected",
  "active",
  "activeValue",
  "pressed",
  "disabled",
] as const;

/**
 * One state stage of {@link STATE_STAGES}.
 *
 * @example
 * ```xml
 * <State name="active" value="one" />
 * ```
 * @example
 * ```ts
 * const stage: StateStage = "activeValue";
 * ```
 */
type StateStage = (typeof STATE_STAGES)[number];

/**
 * The shape a valued `active` state must match before its value reaches a
 * selector.
 *
 * @example
 * ```xml
 * <State name="active" value="one" />
 * ```
 * @example
 * ```ts
 * ACTIVE_VALUE.test("one"); // true
 * ```
 */
const ACTIVE_VALUE = /^[a-z][a-zA-Z0-9-]*$/;

/**
 * The inline visual overrides a layout node may carry. Layout-only attributes
 * such as `width`, `dock` or `grow` are left to the renderer.
 *
 * @example
 * ```xml
 * <Panel style="@panel/inset" padding="8" cornerRadius="4" />
 * ```
 * @example
 * ```ts
 * OVERRIDE_ATTRIBUTES.includes("padding"); // true
 * ```
 */
const OVERRIDE_ATTRIBUTES = [
  "background",
  "border",
  "borderWidth",
  "cornerRadius",
  "padding",
  "shadow",
  "foreground",
  "opacity",
  "textStyle",
] as const;

/**
 * The declarations a text style passes on to descendants: the inheritable
 * ones only.
 *
 * @example
 * ```xml
 * <PanelStyle id="inset" textStyle="@text/body" />
 * ```
 * @example
 * ```ts
 * INHERITABLE_PROPERTIES.has("color"); // true
 * ```
 */
const INHERITABLE_PROPERTIES = new Set([
  "color",
  "letter-spacing",
  "text-transform",
  "line-height",
]);

/**
 * The slider attributes and the custom property each one writes.
 *
 * @example
 * ```xml
 * <SliderStyle id="seek" thickness="4" track="@slot/progressTrack" />
 * ```
 * @example
 * ```ts
 * SLIDER_VARIABLES.thickness; // "--wmm-slider-thickness"
 * ```
 */
const SLIDER_VARIABLES: Record<string, string> = {
  thickness: "--wmm-slider-thickness",
  cornerRadius: "--wmm-slider-radius",
  track: "--wmm-slider-track",
  fill: "--wmm-slider-fill",
  buffer: "--wmm-slider-buffer",
  border: "--wmm-slider-border",
  thumb: "--wmm-slider-thumb",
  thumbImage: "--wmm-slider-thumb-image",
  thumbSize: "--wmm-slider-thumb-size",
  opacity: "--wmm-slider-opacity",
};

/**
 * The slider thumb kinds, mapped to the keywords the serializer writes.
 *
 * @example
 * ```xml
 * <SliderStyle id="seek" thumb="round" />
 * ```
 * @example
 * ```ts
 * SLIDER_THUMBS.round; // "round"
 * ```
 */
const SLIDER_THUMBS: Record<string, string> = {
  none: "none",
  round: "round",
  image: "image",
};

/**
 * Builds the one stylesheet a theme renders with: host-generated class names
 * per style id, the host built-in fallback classes, the per-node inline
 * overrides of the active layout, and the state rules in precedence order.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" background="@brush/chrome-gloss">
 *   <State name="hover" background="@brush/chrome-gloss-hi" />
 * </ButtonStyle>
 * ```
 * @example
 * ```ts
 * const sheet = buildThemeStylesheet(ir, {
 *   formFactor: "desktop",
 *   images: (id) => loaded.get(id),
 * });
 * sheet.classes.button.transport; // "wmm-t-1x9f2a"
 * ```
 */
export function buildThemeStylesheet(
  ir: ThemeIR,
  options: BuildThemeStylesheetOptions
): ThemeStylesheet {
  const ctx: StyleContext = {
    ir,
    images: options.images,
    formFactor: options.formFactor,
  };

  const classes = {
    button: classMap(ir, "button", Object.keys(ir.buttonStyles)),
    panel: classMap(ir, "panel", Object.keys(ir.panelStyles)),
    slider: classMap(ir, "slider", Object.keys(ir.sliderStyles)),
    text: classMap(ir, "text", Object.keys(ir.textStyles)),
  };

  const defaults = {
    button: defaultClass(
      classes.button,
      ir.defaults.button,
      BUILTIN_BUTTON_CLASS
    ),
    panel: defaultClass(classes.panel, ir.defaults.panel, BUILTIN_PANEL_CLASS),
    text: defaultClass(classes.text, ir.defaults.text, BUILTIN_TEXT_CLASS),
  };

  const rules: string[] = [...builtinRules(options.formFactor)];

  for (const id of sortedIds(ir.textStyles)) {
    rules.push(
      rule(
        `.${classes.text[id]}`,
        serializeTextStyle(ir.textStyles[id], textContext(ir))
      )
    );
  }

  for (const id of sortedIds(ir.panelStyles)) {
    rules.push(
      rule(
        `.${classes.panel[id]}`,
        panelDeclarations(ir.panelStyles[id].base, ctx)
      )
    );
  }

  for (const id of sortedIds(ir.buttonStyles)) {
    rules.push(
      rule(
        `.${classes.button[id]}`,
        buttonDeclarations(ir.buttonStyles[id].base, ctx, true)
      )
    );
  }

  for (const id of sortedIds(ir.sliderStyles)) {
    rules.push(
      rule(
        `.${classes.slider[id]}`,
        sliderDeclarations(ir.sliderStyles[id].base, ctx)
      )
    );
  }

  const nodeClasses = new Map<IRNode, string>();
  const layout = ir.layouts[options.formFactor];
  if (layout !== undefined) {
    walk(layout, "0", (node, path) => {
      const declarations = overrideDeclarations(node.attributes, ctx);
      if (Object.keys(declarations).length === 0) return;
      const className = themeClassName(
        ir.themeId,
        ir.themeVersion,
        "node",
        path
      );
      nodeClasses.set(node, className);
      rules.push(rule(`.${className}`, declarations));
    });
  }

  for (const stage of STATE_STAGES) {
    if (stage === "hover" && options.formFactor !== "desktop") continue;
    for (const id of sortedIds(ir.buttonStyles)) {
      const style = ir.buttonStyles[id];
      const className = classes.button[id];
      const state = stateOf(style, stage);
      if (state !== undefined) {
        const selector = stateSelector(className, stage, state);
        if (selector !== undefined) {
          rules.push(
            rule(selector, buttonDeclarations(state.properties, ctx, false))
          );
        }
      }
      if (stage === "focused" && !hasFocusRing(style)) {
        rules.push(
          rule(`.${className}:where(:focus-visible)`, {
            outline: `2px solid var(${PALETTE_VARIABLES.ring[0]})`,
            "outline-offset": "2px",
          })
        );
      }
    }
    for (const id of sortedIds(ir.panelStyles)) {
      const style = ir.panelStyles[id];
      const state = stateOf(style, stage);
      if (state === undefined) continue;
      const selector = stateSelector(classes.panel[id], stage, state);
      if (selector !== undefined) {
        rules.push(rule(selector, panelDeclarations(state.properties, ctx)));
      }
    }
    for (const id of sortedIds(ir.sliderStyles)) {
      const style = ir.sliderStyles[id];
      const state = stateOf(style, stage);
      if (state === undefined) continue;
      const selector = stateSelector(classes.slider[id], stage, state);
      if (selector !== undefined) {
        rules.push(rule(selector, sliderDeclarations(state.properties, ctx)));
      }
    }
  }

  return { cssText: rules.join("\n"), classes, defaults, nodeClasses };
}

/**
 * What every declaration serializer needs: the theme, the image resolver and
 * the form factor whose layout supplies the inline overrides.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const ctx: StyleContext = { ir, images, formFactor: "desktop" };
 * ```
 */
interface StyleContext {
  readonly ir: ThemeIR;
  readonly images: ThemeImageResolver;
  readonly formFactor: FormFactor;
}

/** The class map of one style table, keyed by author id. */
function classMap(
  ir: ThemeIR,
  kind: string,
  ids: string[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const id of [...ids].sort()) {
    map[id] = themeClassName(ir.themeId, ir.themeVersion, kind, id);
  }
  return map;
}

/** The class an element falls back to. */
function defaultClass(
  classes: Record<string, string>,
  id: string | undefined,
  builtin: string
): string {
  if (id === undefined) return builtin;
  return classes[id] ?? builtin;
}

/** The ids of a style table in stable order. */
function sortedIds(table: Record<string, unknown>): string[] {
  return Object.keys(table).sort();
}

/** One CSS rule with its declarations in insertion order. */
function rule(selector: string, declarations: Record<string, string>): string {
  const body = Object.entries(declarations)
    .map(([name, value]) => `${name}:${value};`)
    .join("");
  return `${selector}{${body}}`;
}

/** The host built-in fallback classes, derived from the palette variables. */
function builtinRules(formFactor: FormFactor): string[] {
  const rules = [
    rule(`.${BUILTIN_BUTTON_CLASS}`, {
      display: "inline-flex",
      "align-items": "center",
      "justify-content": "center",
      gap: "6px",
      "padding-block-start": "6px",
      "padding-inline-end": "10px",
      "padding-block-end": "6px",
      "padding-inline-start": "10px",
      "border-radius": "var(--radius)",
      color: "var(--foreground)",
      "background-color": "transparent",
    }),
    rule(`.${BUILTIN_PANEL_CLASS}`, {
      color: "var(--foreground)",
      "background-color": "transparent",
    }),
    rule(`.${BUILTIN_TEXT_CLASS}`, { color: "inherit" }),
  ];
  if (formFactor === "desktop") {
    rules.push(
      rule(`.${BUILTIN_BUTTON_CLASS}:where(:hover:not(:disabled))`, {
        "background-color": "var(--accent)",
        color: "var(--accent-foreground)",
      })
    );
  }
  rules.push(
    rule(`.${BUILTIN_BUTTON_CLASS}:where(:focus-visible)`, {
      outline: `2px solid var(${PALETTE_VARIABLES.ring[0]})`,
      "outline-offset": "2px",
    })
  );
  rules.push(
    rule(`.${BUILTIN_BUTTON_CLASS}:where(:disabled,[aria-disabled="true"])`, {
      opacity: "0.5",
    })
  );
  return rules;
}

/** The text style context of a theme. */
function textContext(ir: ThemeIR): {
  themeId: string;
  fonts: ThemeIR["fonts"];
  shadows: ThemeIR["shadows"];
} {
  return { themeId: ir.themeId, fonts: ir.fonts, shadows: ir.shadows };
}

/** The inheritable declarations of a text style reference. */
function textStyleDeclarations(
  props: Record<string, IRValue>,
  ctx: StyleContext
): Record<string, string> {
  const ref = referenceOf(props.textStyle, "text");
  if (ref === undefined) return {};
  const style = ctx.ir.textStyles[ref.id];
  if (style === undefined) return {};
  const declarations = serializeTextStyle(style, textContext(ctx.ir));
  const inheritable: Record<string, string> = {};
  for (const [name, value] of Object.entries(declarations)) {
    if (name.startsWith("font-") || INHERITABLE_PROPERTIES.has(name)) {
      inheritable[name] = value;
    }
  }
  return inheritable;
}

/** The declarations of a button style or one of its states. */
function buttonDeclarations(
  props: Record<string, IRValue>,
  ctx: StyleContext,
  includeLayout: boolean
): Record<string, string> {
  const declarations: Record<string, string> = {};
  if (includeLayout) {
    declarations["display"] = "inline-flex";
    declarations["align-items"] = "center";
    declarations["justify-content"] = "center";
    declarations["gap"] = "6px";
  }

  const imageRef = referenceOf(props.image, "image");
  const image = imageRef === undefined ? undefined : ctx.images(imageRef.id);
  if (image !== undefined) {
    declarations["background"] =
      `${cssImage(image)} center / contain no-repeat`;
    declarations["background-color"] = "transparent";
    declarations["border-color"] = "transparent";
    if (image.width !== undefined) {
      declarations["inline-size"] = serializeLength(image.width);
    }
    if (image.height !== undefined) {
      declarations["block-size"] = serializeLength(image.height);
    }
  } else {
    const background = brushValue(props.background);
    if (background !== undefined) {
      Object.assign(
        declarations,
        serializeBrush(background, {
          brushes: ctx.ir.brushes,
          images: ctx.images,
        })
      );
    }
    const border = colorValue(props.border);
    if (border !== undefined) {
      declarations["border-color"] = serializeColor(border);
    }
    const borderWidth = thicknessValue(props.borderWidth);
    if (borderWidth !== undefined) {
      declarations["border-style"] = "solid";
      Object.assign(
        declarations,
        serializeThickness("border-width", borderWidth)
      );
    }
  }

  const foreground = colorValue(props.foreground);
  if (foreground !== undefined) {
    declarations["color"] = serializeColor(foreground);
  }

  const cornerRadius = thicknessValue(props.cornerRadius);
  if (cornerRadius !== undefined) {
    Object.assign(declarations, serializeCornerRadius(cornerRadius));
  }

  const padding = thicknessValue(props.padding);
  if (padding !== undefined) {
    Object.assign(declarations, serializeThickness("padding", padding));
  }

  const minWidth = numberValue(props.minWidth);
  if (minWidth !== undefined) {
    declarations["min-inline-size"] = serializeLength(minWidth);
  }

  const minHeight = numberValue(props.minHeight);
  if (minHeight !== undefined) {
    declarations["min-block-size"] = serializeLength(minHeight);
  }

  const iconSize = numberValue(props.iconSize);
  if (iconSize !== undefined) {
    declarations["--wmm-icon-size"] = serializeLength(iconSize);
  }

  Object.assign(declarations, textStyleDeclarations(props, ctx));

  const shadow = shadowDeclarations(props.shadow, ctx);
  if (shadow !== undefined) declarations["box-shadow"] = shadow;

  const opacity = numberValue(props.opacity);
  if (opacity !== undefined) declarations["opacity"] = String(opacity);

  const iconVisible = booleanValue(props.iconVisible);
  if (iconVisible !== undefined) {
    declarations["--wmm-icon-display"] = iconVisible ? "inline-flex" : "none";
  }

  const iconFill = booleanValue(props.iconFill);
  if (iconFill !== undefined) {
    declarations["--wmm-icon-fill"] = iconFill ? "currentColor" : "none";
  }

  const labelVisible = booleanValue(props.labelVisible);
  if (labelVisible !== undefined) {
    declarations["--wmm-label-display"] = labelVisible ? "inline" : "none";
  }

  return declarations;
}

/** The declarations of a panel style or one of its states. */
function panelDeclarations(
  props: Record<string, IRValue>,
  ctx: StyleContext
): Record<string, string> {
  const declarations: Record<string, string> = {};

  const background = brushValue(props.background);
  if (background !== undefined) {
    Object.assign(
      declarations,
      serializeBrush(background, {
        brushes: ctx.ir.brushes,
        images: ctx.images,
      })
    );
  }

  const border = colorValue(props.border);
  if (border !== undefined) {
    declarations["border-color"] = serializeColor(border);
  }

  const borderWidth = thicknessValue(props.borderWidth);
  if (borderWidth !== undefined) {
    declarations["border-style"] = "solid";
    Object.assign(
      declarations,
      serializeThickness("border-width", borderWidth)
    );
  }

  const cornerRadius = thicknessValue(props.cornerRadius);
  if (cornerRadius !== undefined) {
    Object.assign(declarations, serializeCornerRadius(cornerRadius));
  }

  const padding = thicknessValue(props.padding);
  if (padding !== undefined) {
    Object.assign(declarations, serializeThickness("padding", padding));
  }

  const shadow = shadowDeclarations(props.shadow, ctx);
  if (shadow !== undefined) declarations["box-shadow"] = shadow;

  const clip = booleanValue(props.clip);
  if (clip === true) {
    declarations["overflow"] = "hidden";
  } else if (clip === undefined && hasRadius(cornerRadius)) {
    declarations["overflow"] = "hidden";
  }

  Object.assign(declarations, textStyleDeclarations(props, ctx));

  return declarations;
}

/** The custom properties of a slider style or one of its states. */
function sliderDeclarations(
  props: Record<string, IRValue>,
  ctx: StyleContext
): Record<string, string> {
  const declarations: Record<string, string> = {};

  const thickness = numberValue(props.thickness);
  if (thickness !== undefined) {
    declarations[SLIDER_VARIABLES.thickness] = serializeLength(thickness);
  }

  const cornerRadius = thicknessValue(props.cornerRadius);
  if (cornerRadius !== undefined) {
    declarations[SLIDER_VARIABLES.cornerRadius] = cornerRadius
      .map(serializeLength)
      .join(" ");
  }

  for (const name of ["track", "fill", "buffer"] as const) {
    const brush = brushValue(props[name]);
    if (brush === undefined) continue;
    const value = brushString(brush, ctx);
    if (value !== undefined) declarations[SLIDER_VARIABLES[name]] = value;
  }

  const border = colorValue(props.border);
  if (border !== undefined) {
    declarations[SLIDER_VARIABLES.border] = serializeColor(border);
  }

  const thumb = enumValue(props.thumb, SLIDER_THUMBS);
  if (thumb !== undefined) {
    declarations[SLIDER_VARIABLES.thumb] = thumb;
  }

  const thumbImage = referenceOf(props.thumbImage, "image");
  if (thumbImage !== undefined) {
    const image = ctx.images(thumbImage.id);
    if (image !== undefined) {
      declarations[SLIDER_VARIABLES.thumbImage] = cssImage(image);
    }
  }

  const thumbSize = numberValue(props.thumbSize);
  if (thumbSize !== undefined) {
    declarations[SLIDER_VARIABLES.thumbSize] = serializeLength(thumbSize);
  }

  const opacity = numberValue(props.opacity);
  if (opacity !== undefined) {
    declarations[SLIDER_VARIABLES.opacity] = String(opacity);
  }

  return declarations;
}

/** The declarations of a layout node's inline visual overrides. */
function overrideDeclarations(
  attributes: Record<string, IRValue>,
  ctx: StyleContext
): Record<string, string> {
  const declarations: Record<string, string> = {};
  if (!OVERRIDE_ATTRIBUTES.some((name) => attributes[name] !== undefined)) {
    return declarations;
  }

  const background = brushValue(attributes.background);
  if (background !== undefined) {
    Object.assign(
      declarations,
      serializeBrush(background, {
        brushes: ctx.ir.brushes,
        images: ctx.images,
      })
    );
  }

  const border = colorValue(attributes.border);
  if (border !== undefined) {
    declarations["border-color"] = serializeColor(border);
  }

  const borderWidth = thicknessValue(attributes.borderWidth);
  if (borderWidth !== undefined) {
    declarations["border-style"] = "solid";
    Object.assign(
      declarations,
      serializeThickness("border-width", borderWidth)
    );
  }

  const cornerRadius = thicknessValue(attributes.cornerRadius);
  if (cornerRadius !== undefined) {
    Object.assign(declarations, serializeCornerRadius(cornerRadius));
  }

  const padding = thicknessValue(attributes.padding);
  if (padding !== undefined) {
    Object.assign(declarations, serializeThickness("padding", padding));
  }

  const shadow = shadowDeclarations(attributes.shadow, ctx);
  if (shadow !== undefined) declarations["box-shadow"] = shadow;

  const foreground = colorValue(attributes.foreground);
  if (foreground !== undefined) {
    declarations["color"] = serializeColor(foreground);
  }

  const opacity = numberValue(attributes.opacity);
  if (opacity !== undefined) declarations["opacity"] = String(opacity);

  Object.assign(declarations, textStyleDeclarations(attributes, ctx));

  return declarations;
}

/** The `box-shadow` value of a shadow reference. */
function shadowDeclarations(
  value: IRValue | undefined,
  ctx: StyleContext
): string | undefined {
  const ref = referenceOf(value, "shadow");
  if (ref === undefined) return undefined;
  const layers = ctx.ir.shadows[ref.id];
  if (layers === undefined) return undefined;
  return serializeShadow(layers);
}

/** The CSS value of a brush, preferring its image over its color. */
function brushString(
  value: IRBrushValue,
  ctx: StyleContext
): string | undefined {
  const declarations = serializeBrush(value, {
    brushes: ctx.ir.brushes,
    images: ctx.images,
  });
  const image = declarations["background-image"];
  if (image !== undefined && image !== "none") return image;
  const borderImage = declarations["border-image-source"];
  if (borderImage !== undefined) return borderImage;
  return declarations["background-color"];
}

/** Whether any corner of a radius is above zero. */
function hasRadius(value: number[] | undefined): boolean {
  return value !== undefined && value.some((corner) => corner > 0);
}

/** The state of one stage, if the style declares it. */
function stateOf(style: IRStyle, stage: StateStage): IRStyleState | undefined {
  return style.states.find((state) => stageOf(state) === stage);
}

/** The stage a state belongs to. */
function stageOf(state: IRStyleState): StateStage | undefined {
  switch (state.name) {
    case "focused":
      return "focused";
    case "hover":
      return "hover";
    case "selected":
      return "selected";
    case "active":
      return state.value === undefined ? "active" : "activeValue";
    case "pressed":
      return "pressed";
    case "disabled":
      return "disabled";
    default:
      return undefined;
  }
}

/** The selector of one state, with `:where()` keeping specificity equal. */
function stateSelector(
  className: string,
  stage: StateStage,
  state: IRStyleState
): string | undefined {
  switch (stage) {
    case "focused":
      return `.${className}:where(:focus-visible)`;
    case "hover":
      return `.${className}:where(:hover:not(:disabled))`;
    case "selected":
      return `.${className}:where([data-selected])`;
    case "active":
      return `.${className}:where([data-active])`;
    case "activeValue": {
      const value = state.value ?? "";
      if (!ACTIVE_VALUE.test(value)) return undefined;
      return `.${className}:where([data-active-value="${value}"])`;
    }
    case "pressed":
      return `.${className}:where(:active:not(:disabled))`;
    case "disabled":
      return `.${className}:where(:disabled,[aria-disabled="true"])`;
  }
}

/** Whether a style's focused state already draws a visible focus indicator. */
function hasFocusRing(style: IRStyle): boolean {
  const focused = style.states.find((state) => state.name === "focused");
  if (focused === undefined) return false;
  return (
    focused.properties.border !== undefined ||
    focused.properties.borderWidth !== undefined ||
    focused.properties.shadow !== undefined
  );
}

/** Visits every node of a layout tree with its stable depth-first index. */
function walk(
  node: IRNode,
  path: string,
  visit: (node: IRNode, path: string) => void
): void {
  visit(node, path);
  node.children.forEach((child, index) => {
    walk(child, `${path}.${index}`, visit);
  });
}

/** Whether a compiled value is a reference of the given kind. */
function referenceOf(
  value: IRValue | undefined,
  ref: string
): IRRef | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  if (!("ref" in value) || value.ref !== ref) return undefined;
  return typeof value.id === "string" ? value : undefined;
}

/** A compiled brush value. */
function brushValue(value: IRValue | undefined): IRBrushValue | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  if (!("kind" in value)) return undefined;
  return value.kind === "color" || value.kind === "brush" ? value : undefined;
}

/** A compiled color value. */
function colorValue(value: IRValue | undefined): IRColor | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  if (!("kind" in value)) return undefined;
  return value.kind === "literal" || value.kind === "slot" ? value : undefined;
}

/** A compiled thickness or corner radius value. */
function thicknessValue(value: IRValue | undefined): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const numbers = value.filter(
    (entry): entry is number => typeof entry === "number"
  );
  return numbers.length === value.length ? numbers : undefined;
}

/** A compiled number value. */
function numberValue(value: IRValue | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

/** A compiled boolean value. */
function booleanValue(value: IRValue | undefined): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/** A compiled enum value mapped through a host whitelist. */
function enumValue(
  value: IRValue | undefined,
  table: Record<string, string>
): string | undefined {
  return typeof value === "string" ? table[value] : undefined;
}
