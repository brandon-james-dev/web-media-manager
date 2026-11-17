import { WMM_THEME_COMMANDS } from "@/events/taxonomy";
import type { WmmCommandName } from "@/events/taxonomy";
import {
  ICON_NAMES,
  PALETTE_SLOTS,
  REQUIRED_PALETTE_SLOTS,
  ReferenceKind,
  THEME_ELEMENTS,
} from "../componentModel";
import { IssueSeverity } from "@/lib/themes/issues";
import type { ThemeIssue } from "@/lib/themes/issues";
import type { ThemeNode } from "../parser";
import { REFERENCE } from "./constants";

/**
 * The reference kind each `theme.xml` declaration element defines. An
 * element missing from this table declares nothing.
 *
 * @example
 * ```xml
 * <LinearGradient id="chrome-gloss" angle="180" />
 * ```
 * @example
 * ```ts
 * DECLARED_KIND.LinearGradient; // ReferenceKind.Brush
 * ```
 */
const DECLARED_KIND: Readonly<Record<string, ReferenceKind>> = {
  Color: ReferenceKind.Color,
  Length: ReferenceKind.Length,
  FontFamily: ReferenceKind.Font,
  TextStyle: ReferenceKind.Text,
  Image: ReferenceKind.Image,
  SolidBrush: ReferenceKind.Brush,
  LinearGradient: ReferenceKind.Brush,
  ImageBrush: ReferenceKind.Brush,
  Shadow: ReferenceKind.Shadow,
  ButtonStyle: ReferenceKind.Button,
  SliderStyle: ReferenceKind.Slider,
  PanelStyle: ReferenceKind.Panel,
};

/**
 * The deepest `basedOn` chain a style may have (`E6013`).
 *
 * @example
 * ```xml
 * <TextStyle id="caption" basedOn="@text/body" size="11" />
 * ```
 * @example
 * ```ts
 * if (depth > MAX_BASED_ON_DEPTH) report("E6013", style);
 * ```
 */
const MAX_BASED_ON_DEPTH = 8;

/**
 * The most font families and faces one theme may declare (`E6016`).
 *
 * @example
 * ```xml
 * <FontFamily id="ui" fallback="sansSerif" />
 * ```
 * @example
 * ```ts
 * if (families > MAX_FONT_FAMILIES) report("E6016", family);
 * ```
 */
const MAX_FONT_FAMILIES = 8;

/**
 * The most font faces one theme may declare across all families (`E6016`).
 *
 * @example
 * ```xml
 * <Face src="assets/fonts/ui-regular.woff2" weight="400" />
 * ```
 * @example
 * ```ts
 * if (faces > MAX_FONT_FACES) report("E6016", face);
 * ```
 */
const MAX_FONT_FACES = 16;

/**
 * The state names each style kind supports (`E6015`).
 *
 * @example
 * ```xml
 * <SliderStyle id="seek" thickness="4">
 *   <State name="hover" thumbSize="14" />
 * </SliderStyle>
 * ```
 * @example
 * ```ts
 * STATE_NAMES.SliderStyle.includes("active"); // false
 * ```
 */
const STATE_NAMES: Readonly<Record<string, readonly string[]>> = {
  ButtonStyle: [
    "hover",
    "pressed",
    "focused",
    "disabled",
    "selected",
    "active",
  ],
  SliderStyle: ["hover", "pressed", "focused", "disabled"],
};

/**
 * Style attributes a `<State>` may never override (`E6015`).
 *
 * @example
 * ```xml
 * <State name="hover" minWidth="40" />
 * ```
 * @example
 * ```ts
 * FIXED_STATE_ATTRIBUTES.has("basedOn"); // true
 * ```
 */
const FIXED_STATE_ATTRIBUTES: ReadonlySet<string> = new Set([
  "basedOn",
  "minWidth",
  "minHeight",
]);

/**
 * Host-owned names that `@slot/` and `@icon/` references resolve against.
 *
 * @example
 * ```xml
 * <PanelStyle id="inset" background="@slot/card" />
 * ```
 * @example
 * ```ts
 * HOST_NAMES[ReferenceKind.Slot]?.has("card"); // true
 * ```
 */
const HOST_NAMES: Partial<Record<ReferenceKind, ReadonlySet<string>>> = {
  [ReferenceKind.Slot]: new Set<string>(PALETTE_SLOTS),
  [ReferenceKind.Icon]: new Set<string>(ICON_NAMES),
};

/**
 * A parsed layout file passed to {@link checkTheme} for the cross-file
 * checks.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const layout: ThemeLayout = { root, file: "layouts/desktop.xml" };
 * ```
 */
export interface ThemeLayout {
  root: ThemeNode;
  file: string;
}

/**
 * Runs the stage 6 semantic checks on a grammatically valid `theme.xml`
 * tree: two declarations with one id in one reference kind (`E6011`),
 * references that resolve to nothing, including unknown `@slot/` and
 * `@icon/` names (`E6010`), colors whose `@color/` chain loops back to
 * themselves (`E4011`), and `basedOn` chains that loop or run deeper than 8
 * (`E6013`). Each palette sets the required slots and no scheme repeats
 * (`E6014`); each `<State>` uses a name its style kind supports, a `value`
 * only on `active`, no repeat, and only its style's properties except
 * `basedOn`, `minWidth` and `minHeight` (`E6015`); `maxLines` needs an
 * effective `overflow="wrap"`, `thumb="image"` an effective `thumbImage`,
 * gradient stops never decrease, and fonts stay within 8 families and 16
 * faces (`E6016`). Given the package's layouts, it also reports layout
 * references that `theme.xml` does not declare (`E6010`, in the layout file)
 * and buttons whose style, or a style it is based on, has a
 * `<State name="active" value>` outside the value domain of the button's
 * command (`E6104`, at the button; a button without `style` uses
 * `Defaults button`). Elements and attributes whose prefix the root lists
 * in `ignorable` are skipped.
 *
 * @example
 * ```xml
 * <ButtonStyle id="repeat">
 *   <State name="active" value="one" image="@image/repeat-one" />
 * </ButtonStyle>
 * <Button command="wmm.playback.toggleShuffle" labelKey="playback.shuffle"
 *         style="@button/repeat" />
 * ```
 * @example
 * ```ts
 * const issues = checkTheme(themeRoot, "theme.xml", [
 *   { root: desktopRoot, file: "layouts/desktop.xml" },
 * ]);
 * ```
 */
export function checkTheme(
  root: ThemeNode,
  file: string,
  layouts: readonly ThemeLayout[] = []
): ThemeIssue[] {
  const issues: ThemeIssue[] = [];
  const ignorableOf = (node: ThemeNode): ReadonlySet<string> =>
    new Set(
      (node.attributes.ignorable?.value ?? "").split(" ").filter(Boolean)
    );
  const ignorable = ignorableOf(root);
  const isIgnored = (prefix: string): boolean =>
    prefix !== "" && ignorable.has(prefix);

  const report = (
    code: string,
    message: string,
    node: ThemeNode,
    inFile = file
  ): void => {
    issues.push({
      code,
      severity: IssueSeverity.Error,
      file: inFile,
      line: node.line,
      column: node.column,
      path: node.path,
      message,
    });
  };

  const nodes: ThemeNode[] = [];
  const collect = (node: ThemeNode): void => {
    nodes.push(node);
    for (const child of node.children) {
      if (!isIgnored(child.prefix)) collect(child);
    }
  };
  collect(root);

  const declared = new Map<string, Map<string, ThemeNode>>();
  for (const node of nodes) {
    const kind = DECLARED_KIND[node.local];
    const id = node.attributes.id?.value;
    if (kind === undefined || id === undefined) continue;
    const ids = declared.get(kind) ?? new Map<string, ThemeNode>();
    declared.set(kind, ids);
    if (ids.has(id)) {
      report(
        "E6011",
        `@${kind}/${id} is already declared at ${ids.get(id)!.path}.`,
        node
      );
      continue;
    }
    ids.set(id, node);
  }

  const resolves = (kind: string, id: string): boolean =>
    HOST_NAMES[kind as ReferenceKind]?.has(id) ??
    declared.get(kind)?.has(id) ??
    false;

  for (const node of nodes) {
    for (const attribute of Object.values(node.attributes)) {
      if (isIgnored(attribute.prefix) || attribute.local === "id") continue;
      for (const token of attribute.value.split(" ")) {
        const match = REFERENCE.exec(token);
        if (match === null || resolves(match[1], match[2])) continue;
        report("E6010", `${attribute.name}: ${token} is not declared.`, node);
      }
    }
  }

  const target = (
    node: ThemeNode,
    attribute: string,
    kind: string
  ): ThemeNode | undefined => {
    const match = REFERENCE.exec(node.attributes[attribute]?.value ?? "");
    return match !== null && match[1] === kind
      ? declared.get(kind)?.get(match[2])
      : undefined;
  };

  const chainOf = (
    start: ThemeNode,
    attribute: string,
    kind: string
  ): { loops: boolean; depth: number } => {
    const seen = new Set<ThemeNode>([start]);
    let depth = 0;
    let next = target(start, attribute, kind);
    while (next !== undefined) {
      if (next === start) return { loops: true, depth };
      if (seen.has(next)) return { loops: false, depth };
      seen.add(next);
      depth += 1;
      next = target(next, attribute, kind);
    }
    return { loops: false, depth };
  };

  for (const color of declared.get(ReferenceKind.Color)?.values() ?? []) {
    if (chainOf(color, "value", ReferenceKind.Color).loops) {
      report(
        "E4011",
        `@color/${color.attributes.id.value} refers back to itself through its value chain.`,
        color
      );
    }
  }

  for (const [kind, ids] of declared) {
    for (const style of ids.values()) {
      if (!Object.hasOwn(style.attributes, "basedOn")) continue;
      const { loops, depth } = chainOf(style, "basedOn", kind);
      if (!loops && depth <= MAX_BASED_ON_DEPTH) continue;
      report(
        "E6013",
        loops
          ? `@${kind}/${style.attributes.id.value} is based on itself through its basedOn chain.`
          : `@${kind}/${style.attributes.id.value} has a basedOn chain ${depth} deep; the limit is ${MAX_BASED_ON_DEPTH}.`,
        style
      );
    }
  }

  const inherited = (
    style: ThemeNode,
    attribute: string,
    kind: string
  ): string | undefined => {
    const seen = new Set<ThemeNode>();
    let next: ThemeNode | undefined = style;
    while (next !== undefined && !seen.has(next)) {
      const value = next.attributes[attribute]?.value;
      if (value !== undefined) return value;
      seen.add(next);
      next = target(next, "basedOn", kind);
    }
    return undefined;
  };

  const schemes = new Map<string, ThemeNode>();
  let families = 0;
  let faces = 0;
  for (const node of nodes) {
    const children = node.children.filter((child) => !isIgnored(child.prefix));
    switch (node.local) {
      case "Palette": {
        const scheme = node.attributes.scheme.value;
        if (schemes.has(scheme)) {
          report("E6014", `A ${scheme} palette is already declared.`, node);
        }
        schemes.set(scheme, node);
        const set = new Set(
          children.map((child) => child.attributes.slot?.value)
        );
        const missing = REQUIRED_PALETTE_SLOTS.filter((slot) => !set.has(slot));
        if (missing.length > 0) {
          report(
            "E6014",
            `The ${scheme} palette must set ${missing.join(", ")}.`,
            node
          );
        }
        break;
      }
      case "FontFamily":
        families += 1;
        if (families === MAX_FONT_FAMILIES + 1) {
          report(
            "E6016",
            `A theme may declare at most ${MAX_FONT_FAMILIES} font families.`,
            node
          );
        }
        break;
      case "Face":
        faces += 1;
        if (faces === MAX_FONT_FACES + 1) {
          report(
            "E6016",
            `A theme may declare at most ${MAX_FONT_FACES} font faces.`,
            node
          );
        }
        break;
      case "LinearGradient": {
        let previous = 0;
        for (const stop of children) {
          const offset = Number(stop.attributes.offset?.value);
          if (offset < previous) {
            report(
              "E6016",
              `Stop offset ${offset} is lower than the previous ${previous}; offsets must not decrease.`,
              stop
            );
          }
          previous = Math.max(previous, offset);
        }
        break;
      }
      case "TextStyle":
        if (
          Object.hasOwn(node.attributes, "maxLines") &&
          inherited(node, "overflow", ReferenceKind.Text) !== "wrap"
        ) {
          report("E6016", `maxLines needs overflow="wrap".`, node);
        }
        break;
      case "SliderStyle":
        if (
          inherited(node, "thumb", ReferenceKind.Slider) === "image" &&
          inherited(node, "thumbImage", ReferenceKind.Slider) === undefined
        ) {
          report("E6016", `thumb="image" needs a thumbImage.`, node);
        }
        checkStates(node, children);
        break;
      case "ButtonStyle":
        checkStates(node, children);
        break;
    }
  }

  const defaultButton = nodes.find((node) => node.local === "Defaults")
    ?.attributes.button?.value;

  const activeValuesOf = (reference: string | undefined): ThemeNode[] => {
    const match = REFERENCE.exec(reference ?? "");
    const states: ThemeNode[] = [];
    const seen = new Set<ThemeNode>();
    let style =
      match !== null && match[1] === ReferenceKind.Button
        ? declared.get(ReferenceKind.Button)?.get(match[2])
        : undefined;
    while (style !== undefined && !seen.has(style)) {
      seen.add(style);
      for (const state of style.children) {
        if (
          !isIgnored(state.prefix) &&
          state.attributes.name?.value === "active" &&
          state.attributes.value !== undefined
        ) {
          states.push(state);
        }
      }
      style = target(style, "basedOn", ReferenceKind.Button);
    }
    return states;
  };

  for (const layout of layouts) {
    const layoutIgnorable = ignorableOf(layout.root);
    const skip = (prefix: string): boolean =>
      prefix !== "" && layoutIgnorable.has(prefix);
    const visit = (node: ThemeNode): void => {
      for (const attribute of Object.values(node.attributes)) {
        if (skip(attribute.prefix)) continue;
        for (const token of attribute.value.split(" ")) {
          const match = REFERENCE.exec(token);
          if (match === null || resolves(match[1], match[2])) continue;
          report(
            "E6010",
            `${attribute.name}: ${token} is not declared in theme.xml.`,
            node,
            layout.file
          );
        }
      }
      const command = node.attributes.command?.value;
      if (node.local === "Button" && command !== undefined) {
        const domain =
          WMM_THEME_COMMANDS[command as WmmCommandName]?.activeValues ?? [];
        const style = node.attributes.style?.value ?? defaultButton;
        for (const state of activeValuesOf(style)) {
          const value = state.attributes.value.value;
          if (domain.includes(value)) continue;
          report(
            "E6104",
            domain.length === 0
              ? `${style} has an active state for "${value}", but ${command} has no state values.`
              : `${style} has an active state for "${value}", but ${command} only has ${domain.join(", ")}.`,
            node,
            layout.file
          );
        }
      }
      for (const child of node.children) {
        if (!skip(child.prefix)) visit(child);
      }
    };
    visit(layout.root);
  }

  return issues;

  function checkStates(style: ThemeNode, states: ThemeNode[]): void {
    const allowed = STATE_NAMES[style.local] ?? [];
    const styleAttributes = THEME_ELEMENTS[style.local].attributes;
    const seen = new Set<string>();
    for (const state of states) {
      const name = state.attributes.name?.value ?? "";
      const value = state.attributes.value?.value;
      if (!allowed.includes(name)) {
        report(
          "E6015",
          `<${style.name}> has no ${name} state; use ${allowed.join(", ")}.`,
          state
        );
      }
      if (value !== undefined && name !== "active") {
        report("E6015", `Only the active state takes a value.`, state);
      }
      const key = `${name}=${value ?? ""}`;
      if (seen.has(key)) {
        report(
          "E6015",
          `The ${name}${value === undefined ? "" : ` "${value}"`} state is declared twice.`,
          state
        );
      }
      seen.add(key);
      for (const attribute of Object.values(state.attributes)) {
        const { local, name: attributeName, prefix } = attribute;
        if (isIgnored(prefix) || local === "name" || local === "value") {
          continue;
        }
        if (FIXED_STATE_ATTRIBUTES.has(local)) {
          report("E6015", `A state may not override ${attributeName}.`, state);
        } else if (!Object.hasOwn(styleAttributes, local)) {
          report(
            "E6015",
            `${attributeName} is not a <${style.name}> property.`,
            state
          );
        }
      }
    }
  }
}
