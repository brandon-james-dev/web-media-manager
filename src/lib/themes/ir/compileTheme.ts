import {
  LAYOUT_ELEMENTS,
  ReferenceKind,
  THEME_ELEMENTS,
  THEME_NAMESPACE,
  ValueType,
} from "../componentModel";
import type { AttributeDef, FormFactor, PaletteSlot } from "../componentModel";
import { IssueSeverity } from "../issues";
import type { ThemeIssue } from "../issues";
import type { ThemeNode } from "../parser";
import type { ColorScheme, ThemeManifest } from "../package";
import { REFERENCE, STAR_TRACK } from "../validator/constants";
import { derivePalette } from "./derivePalette";
import { THEME_IR_VERSION, normalizeHexColor } from "./themeIr";
import type {
  IRBrush,
  IRBrushValue,
  IRColor,
  IRDefaults,
  IRFont,
  IRGridTrack,
  IRImage,
  IRNode,
  IRShadowLayer,
  IRStyle,
  IRStyleState,
  IRValue,
  ThemeIR,
} from "./themeIr";

/**
 * The validated inputs of {@link compileTheme}: the manifest, the parsed
 * `theme.xml` and one parsed layout per form factor.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
 *   <Shell><PageHost /></Shell>
 * </Layout>
 * ```
 * @example
 * ```ts
 * const input: CompileThemeInput = {
 *   manifest,
 *   theme: themeRoot,
 *   layouts: [{ formFactor: "desktop", root: desktopRoot }],
 * };
 * ```
 */
export interface CompileThemeInput {
  manifest: ThemeManifest;
  theme: ThemeNode;
  layouts: { formFactor: FormFactor; root: ThemeNode }[];
}

/**
 * The result of {@link compileTheme}. `ir` is present only when no error was
 * reported.
 *
 * @example
 * ```xml
 * <Palette scheme="light" />
 * ```
 * @example
 * ```ts
 * const { ir, issues }: CompileThemeResult = compileTheme(input);
 * ```
 */
export interface CompileThemeResult {
  ir?: ThemeIR;
  issues: ThemeIssue[];
}

/**
 * Compiles a validated theme package into {@link ThemeIR}: palettes resolved
 * to literals, `@color/` chains followed, `basedOn` flattened, thicknesses
 * expanded, and layouts turned into {@link IRNode} trees. It assumes stages
 * 3 to 6 passed, and reports `E2007` for a manifest scheme with no palette
 * and `W2007` for a palette the manifest does not list.
 *
 * @example
 * ```xml
 * <Palettes>
 *   <Palette scheme="dark">
 *     <Set slot="background" value="@color/navy-900" />
 *   </Palette>
 * </Palettes>
 * ```
 * @example
 * ```ts
 * const { ir, issues } = compileTheme({
 *   manifest,
 *   theme: themeRoot,
 *   layouts: [{ formFactor: "desktop", root: desktopRoot }],
 * });
 * ir?.palettes.dark?.background; // "#0b1a3aff"
 * ```
 */
export function compileTheme(input: CompileThemeInput): CompileThemeResult {
  const issues: ThemeIssue[] = [];
  const { manifest, theme, layouts } = input;

  const childrenOf = (node: ThemeNode): ThemeNode[] =>
    node.children.filter((child) => child.uri === THEME_NAMESPACE);

  const sections = new Map<string, ThemeNode[]>();
  const collect = (node: ThemeNode): void => {
    for (const child of childrenOf(node)) {
      const list = sections.get(child.local);
      if (list === undefined) sections.set(child.local, [child]);
      else list.push(child);
      collect(child);
    }
  };
  collect(theme);

  const declarations = (name: string): ThemeNode[] => sections.get(name) ?? [];

  const tableOf = (name: string): Map<string, ThemeNode> => {
    const table = new Map<string, ThemeNode>();
    for (const node of declarations(name)) {
      const id = node.attributes.id?.value;
      if (id !== undefined && !table.has(id)) table.set(id, node);
    }
    return table;
  };

  const colorNodes = tableOf("Color");
  const textStyleNodes = tableOf("TextStyle");
  const buttonStyleNodes = tableOf("ButtonStyle");
  const sliderStyleNodes = tableOf("SliderStyle");
  const panelStyleNodes = tableOf("PanelStyle");

  const lengthValues = new Map<string, number>();
  for (const [id, node] of tableOf("Length")) {
    const value = node.attributes.value?.value;
    if (value !== undefined) lengthValues.set(id, Number(value));
  }

  const colorOf = (raw: string): IRColor => {
    const seen = new Set<string>();
    let value = raw;
    for (;;) {
      const match = REFERENCE.exec(value);
      if (match === null) {
        return { kind: "literal", value: normalizeHexColor(value) };
      }
      if (match[1] === ReferenceKind.Slot) {
        return { kind: "slot", slot: match[2] as PaletteSlot };
      }
      if (match[1] !== ReferenceKind.Color || seen.has(match[2])) break;
      seen.add(match[2]);
      const next = colorNodes.get(match[2])?.attributes.value?.value;
      if (next === undefined) break;
      value = next;
    }
    return { kind: "literal", value: "#00000000" };
  };

  const lengthOf = (raw: string): number => {
    const match = REFERENCE.exec(raw);
    if (match !== null && match[1] === ReferenceKind.Length) {
      return lengthValues.get(match[2]) ?? 0;
    }
    return Number(raw);
  };

  const thicknessOf = (raw: string): number[] => {
    const parts = raw.split(" ").filter(Boolean).map(lengthOf);
    if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
    if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
    return parts;
  };

  const gridTracksOf = (raw: string): IRGridTrack[] =>
    raw
      .split(" ")
      .filter(Boolean)
      .map((token): IRGridTrack => {
        if (token === "auto") return { type: "auto" };
        const star = STAR_TRACK.exec(token);
        if (star !== null) return { type: "star", share: Number(star[1]) };
        return { type: "px", value: lengthOf(token) };
      });

  const brushValueOf = (raw: string): IRBrushValue => {
    const match = REFERENCE.exec(raw);
    if (match !== null && match[1] === ReferenceKind.Brush) {
      return { kind: "brush", id: match[2] };
    }
    return { kind: "color", color: colorOf(raw) };
  };

  const referenceOf = (raw: string): IRValue => {
    const match = REFERENCE.exec(raw);
    if (match === null) return raw;
    const [, kind, id] = match;
    if (kind === ReferenceKind.Length) return lengthValues.get(id) ?? 0;
    if (kind === ReferenceKind.Color || kind === ReferenceKind.Slot) {
      return colorOf(raw);
    }
    return { ref: kind as ReferenceKind, id };
  };

  const valueOf = (raw: string, def: AttributeDef): IRValue => {
    switch (def.type) {
      case ValueType.Boolean:
        return raw === "true";
      case ValueType.Integer:
      case ValueType.Number:
        return Number(raw);
      case ValueType.Length:
        return lengthOf(raw);
      case ValueType.LengthOrAuto:
        return raw === "auto" ? "auto" : lengthOf(raw);
      case ValueType.Thickness:
      case ValueType.CornerRadius:
        return thicknessOf(raw);
      case ValueType.Color:
        return colorOf(raw);
      case ValueType.Brush:
        return brushValueOf(raw);
      case ValueType.EnumList:
        return raw.split(" ").filter(Boolean);
      case ValueType.GridTracks:
        return gridTracksOf(raw);
      case ValueType.Reference:
        return referenceOf(raw);
      default:
        return raw;
    }
  };

  const attributesOf = (
    node: ThemeNode,
    defs: Readonly<Record<string, AttributeDef>>,
    skip: readonly string[] = []
  ): Record<string, IRValue> => {
    const values: Record<string, IRValue> = {};
    for (const attribute of Object.values(node.attributes)) {
      if (attribute.prefix !== "") continue;
      if (skip.includes(attribute.local)) continue;
      const def = defs[attribute.local];
      if (def === undefined) continue;
      values[attribute.local] = valueOf(attribute.value, def);
    }
    return values;
  };

  const paletteNodes = new Map<string, ThemeNode>();
  for (const node of declarations("Palette")) {
    const scheme = node.attributes.scheme?.value;
    if (scheme !== undefined && !paletteNodes.has(scheme)) {
      paletteNodes.set(scheme, node);
    }
  }

  for (const scheme of manifest.colorSchemes) {
    if (paletteNodes.has(scheme)) continue;
    issues.push({
      code: "E2007",
      severity: IssueSeverity.Error,
      file: "manifest.json",
      path: "/colorSchemes",
      message: `The manifest lists the ${scheme} scheme, but theme.xml has no <Palette scheme="${scheme}">.`,
    });
  }

  for (const [scheme, node] of paletteNodes) {
    if (manifest.colorSchemes.includes(scheme as ColorScheme)) continue;
    issues.push({
      code: "W2007",
      severity: IssueSeverity.Warning,
      file: "theme.xml",
      line: node.line,
      column: node.column,
      path: node.path,
      message: `The ${scheme} palette is not listed in manifest colorSchemes, so it is not used.`,
    });
  }

  const palettes: ThemeIR["palettes"] = {};
  for (const [scheme, node] of paletteNodes) {
    const literals: Partial<Record<PaletteSlot, string>> = {};
    const slotRefs: { slot: PaletteSlot; source: PaletteSlot }[] = [];
    for (const set of childrenOf(node)) {
      if (set.local !== "Set") continue;
      const slot = set.attributes.slot?.value as PaletteSlot | undefined;
      const value = set.attributes.value?.value;
      if (slot === undefined || value === undefined) continue;
      const color = colorOf(value);
      if (color.kind === "literal") literals[slot] = color.value;
      else slotRefs.push({ slot, source: color.slot });
    }
    const derived = derivePalette(literals);
    for (const { slot, source } of slotRefs) literals[slot] = derived[source];
    palettes[scheme as ColorScheme] = literals;
  }

  const fonts: Record<string, IRFont> = {};
  for (const [id, node] of tableOf("FontFamily")) {
    fonts[id] = {
      fallback: node.attributes.fallback?.value ?? "sansSerif",
      faces: childrenOf(node)
        .filter((face) => face.local === "Face")
        .map((face) => ({
          src: face.attributes.src?.value ?? "",
          weight: Number(face.attributes.weight?.value ?? "400"),
          style: face.attributes.style?.value ?? "normal",
        })),
    };
  }

  const chainOf = (
    node: ThemeNode,
    kind: ReferenceKind,
    table: ReadonlyMap<string, ThemeNode>
  ): ThemeNode[] => {
    const chain: ThemeNode[] = [];
    const seen = new Set<ThemeNode>();
    let next: ThemeNode | undefined = node;
    while (next !== undefined && !seen.has(next)) {
      seen.add(next);
      chain.unshift(next);
      const match = REFERENCE.exec(next.attributes.basedOn?.value ?? "");
      next =
        match !== null && match[1] === kind ? table.get(match[2]) : undefined;
    }
    return chain;
  };

  const textStyles: Record<string, Record<string, IRValue>> = {};
  for (const [id, node] of textStyleNodes) {
    const properties: Record<string, IRValue> = {};
    for (const style of chainOf(node, ReferenceKind.Text, textStyleNodes)) {
      Object.assign(
        properties,
        attributesOf(style, THEME_ELEMENTS.TextStyle.attributes, [
          "id",
          "basedOn",
        ])
      );
    }
    textStyles[id] = properties;
  }

  const images: Record<string, IRImage> = {};
  for (const [id, node] of tableOf("Image")) {
    const slice = node.attributes.slice?.value;
    images[id] = {
      src: node.attributes.src?.value ?? "",
      ...(slice === undefined ? {} : { slice: thicknessOf(slice) }),
      variants: childrenOf(node)
        .filter((variant) => variant.local === "Variant")
        .map((variant) => ({
          scale: Number(variant.attributes.scale?.value ?? "2"),
          src: variant.attributes.src?.value ?? "",
        })),
    };
  }

  const brushes: Record<string, IRBrush> = {};
  for (const [id, node] of tableOf("SolidBrush")) {
    brushes[id] = {
      type: "solid",
      color: colorOf(node.attributes.color?.value ?? "transparent"),
    };
  }
  for (const [id, node] of tableOf("LinearGradient")) {
    brushes[id] = {
      type: "linear",
      angle: Number(node.attributes.angle?.value ?? "180"),
      stops: childrenOf(node)
        .filter((stop) => stop.local === "Stop")
        .map((stop) => ({
          offset: Number(stop.attributes.offset?.value ?? "0"),
          color: colorOf(stop.attributes.color?.value ?? "transparent"),
        })),
    };
  }
  for (const [id, node] of tableOf("ImageBrush")) {
    const match = REFERENCE.exec(node.attributes.image?.value ?? "");
    const tint = node.attributes.tint?.value;
    brushes[id] = {
      type: "image",
      image: match?.[2] ?? "",
      fit: node.attributes.fit?.value ?? "stretch",
      ...(tint === undefined ? {} : { tint: colorOf(tint) }),
    };
  }

  const shadowLayerOf = (
    node: ThemeNode,
    defs: Readonly<Record<string, AttributeDef>>
  ): IRShadowLayer => {
    const number = (name: string): number =>
      Number(node.attributes[name]?.value ?? defs[name]?.default ?? "0");
    return {
      x: number("x"),
      y: number("y"),
      blur: number("blur"),
      spread: number("spread"),
      color: colorOf(node.attributes.color?.value ?? "transparent"),
      inset: node.attributes.inset?.value === "true",
    };
  };

  const shadows: Record<string, IRShadowLayer[]> = {};
  for (const [id, node] of tableOf("Shadow")) {
    const layers = [shadowLayerOf(node, THEME_ELEMENTS.Shadow.attributes)];
    for (const child of childrenOf(node)) {
      if (child.local !== "Layer") continue;
      layers.push(shadowLayerOf(child, THEME_ELEMENTS.Layer.attributes));
    }
    shadows[id] = layers;
  }

  const styleOf = (
    node: ThemeNode,
    kind: ReferenceKind,
    table: ReadonlyMap<string, ThemeNode>,
    defs: Readonly<Record<string, AttributeDef>>
  ): IRStyle => {
    const base: Record<string, IRValue> = {};
    const states = new Map<string, IRStyleState>();
    for (const style of chainOf(node, kind, table)) {
      Object.assign(base, attributesOf(style, defs, ["id", "basedOn"]));
      for (const state of childrenOf(style)) {
        if (state.local !== "State") continue;
        const name = state.attributes.name?.value ?? "";
        const value = state.attributes.value?.value;
        const key = `${name}=${value ?? ""}`;
        const properties = attributesOf(state, defs, [
          "id",
          "name",
          "value",
          "basedOn",
        ]);
        const existing = states.get(key);
        if (existing === undefined) {
          states.set(key, {
            name,
            ...(value === undefined ? {} : { value }),
            properties,
          });
        } else {
          Object.assign(existing.properties, properties);
        }
      }
    }
    return { base, states: [...states.values()] };
  };

  const stylesOf = (
    table: ReadonlyMap<string, ThemeNode>,
    kind: ReferenceKind,
    defs: Readonly<Record<string, AttributeDef>>
  ): Record<string, IRStyle> => {
    const styles: Record<string, IRStyle> = {};
    for (const [id, node] of table) {
      styles[id] = styleOf(node, kind, table, defs);
    }
    return styles;
  };

  const defaults: IRDefaults = {};
  const defaultsNode = declarations("Defaults")[0];
  if (defaultsNode !== undefined) {
    for (const name of ["button", "panel", "text"] as const) {
      const match = REFERENCE.exec(defaultsNode.attributes[name]?.value ?? "");
      if (match !== null) defaults[name] = match[2];
    }
  }

  const nodeOf = (node: ThemeNode): IRNode => {
    const def = Object.hasOwn(LAYOUT_ELEMENTS, node.local)
      ? LAYOUT_ELEMENTS[node.local]
      : undefined;
    return {
      element: node.local,
      attributes: attributesOf(node, def?.attributes ?? {}),
      children: childrenOf(node).map(nodeOf),
    };
  };

  const layoutTrees: ThemeIR["layouts"] = {};
  for (const layout of layouts) {
    layoutTrees[layout.formFactor] = nodeOf(layout.root);
  }

  if (issues.some((issue) => issue.severity === IssueSeverity.Error)) {
    return { issues };
  }

  return {
    ir: {
      irVersion: THEME_IR_VERSION,
      spec: manifest.spec,
      themeId: manifest.id,
      themeVersion: manifest.version,
      name: manifest.name,
      colorSchemes: manifest.colorSchemes,
      honorsUserAccent: manifest.honorsUserAccent,
      formFactors: manifest.formFactors,
      palettes,
      fonts,
      textStyles,
      images,
      brushes,
      shadows,
      buttonStyles: stylesOf(
        buttonStyleNodes,
        ReferenceKind.Button,
        THEME_ELEMENTS.ButtonStyle.attributes
      ),
      sliderStyles: stylesOf(
        sliderStyleNodes,
        ReferenceKind.Slider,
        THEME_ELEMENTS.SliderStyle.attributes
      ),
      panelStyles: stylesOf(
        panelStyleNodes,
        ReferenceKind.Panel,
        THEME_ELEMENTS.PanelStyle.attributes
      ),
      defaults,
      layouts: layoutTrees,
    },
    issues,
  };
}
