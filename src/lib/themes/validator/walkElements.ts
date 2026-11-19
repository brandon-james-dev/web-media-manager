import {
  ElementCategory,
  LAYOUT_ELEMENTS,
  THEME_ELEMENTS,
  THEME_NAMESPACE,
} from "../componentModel";
import type { ElementDef } from "../componentModel";
import { IssueSeverity } from "@/lib/themes/issues";
import type { ThemeIssue } from "@/lib/themes/issues";
import type { ThemeNode } from "../parser";
import { checkValue } from "./checkValue";

/**
 * Element names reserved for bindings and events (`E4022`).
 *
 * @example
 * ```xml
 * <EventTrigger event="wmm.playback.started" />
 * ```
 * @example
 * ```ts
 * RESERVED_BINDING_ELEMENTS.has("Setter"); // true
 * ```
 */
export const RESERVED_BINDING_ELEMENTS: ReadonlySet<string> = new Set([
  "Binding",
  "EventTrigger",
  "Trigger",
  "Setter",
]);

/**
 * Element names reserved for animations (`E4023`).
 *
 * @example
 * ```xml
 * <Storyboard />
 * ```
 * @example
 * ```ts
 * RESERVED_ANIMATION_ELEMENTS.has("Transition"); // true
 * ```
 */
export const RESERVED_ANIMATION_ELEMENTS: ReadonlySet<string> = new Set([
  "Storyboard",
  "Animation",
  "Transition",
]);

/**
 * Runs the stage 4 grammar checks over a parsed layout or `theme.xml` tree,
 * using `THEME_ELEMENTS` when the root is `<Theme>` and `LAYOUT_ELEMENTS`
 * otherwise. `theme.xml` sections must follow the order of the `Theme`
 * child list, each at most once (`E4012`), and `Palettes` is required
 * (`E4009`). Other checks: unknown
 * elements (`E4001`) and attributes (`E4002`), missing required attributes
 * (`E4003`), attribute values ({@link checkValue}), children not allowed
 * under their parent (`E4008`), child counts (`E4009`) and reserved syntax
 * (`E4021`–`E4024`). Elements and attributes whose prefix the root lists in
 * `ignorable` are dropped first. Widget children are left to stage 6
 * (`E6070`).
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" xmlns:v1_2="urn:wmm:theme:1.2"
 *         spec="1.0" ignorable="v1_2" formFactor="desktop">
 *   <Shell>
 *     <Stack>
 *       <v1_2:Slider command="wmm.playback.volume" />
 *       <Button command="wmm.playback.next" labelKey="playback.next" />
 *     </Stack>
 *   </Shell>
 * </Layout>
 * ```
 * @example
 * ```ts
 * const { root } = parseThemeXml(xml, options);
 * const issues = root ? walkElements(root, "layouts/desktop.xml") : [];
 * ```
 */
export function walkElements(root: ThemeNode, file: string): ThemeIssue[] {
  const issues: ThemeIssue[] = [];
  const isTheme = root.local === "Theme";
  const elements = isTheme ? THEME_ELEMENTS : LAYOUT_ELEMENTS;
  const kind = isTheme ? "theme.xml" : "layout";
  const ignorable = new Set(
    (root.attributes.ignorable?.value ?? "").split(" ").filter(Boolean)
  );

  const report = (code: string, message: string, node: ThemeNode): void => {
    issues.push({
      code,
      severity: IssueSeverity.Error,
      file,
      line: node.line,
      column: node.column,
      path: node.path,
      message,
    });
  };

  const isIgnored = (prefix: string): boolean =>
    prefix !== "" && ignorable.has(prefix);

  const visit = (node: ThemeNode): void => {
    const def = elementDefOf(node);
    if (def === undefined) return;
    checkAttributes(node, def);
    const children = node.children.filter((child) => !isIgnored(child.prefix));
    if (def.category !== ElementCategory.Widget) {
      checkChildren(node, def, children);
    }
    for (const child of children) visit(child);
  };

  const elementDefOf = (node: ThemeNode): ElementDef | undefined => {
    if (RESERVED_BINDING_ELEMENTS.has(node.local)) {
      report("E4022", `<${node.name}> is reserved for bindings.`, node);
      return undefined;
    }
    if (RESERVED_ANIMATION_ELEMENTS.has(node.local)) {
      report("E4023", `<${node.name}> is reserved for animations.`, node);
      return undefined;
    }
    if (node.uri !== THEME_NAMESPACE || !Object.hasOwn(elements, node.local)) {
      report("E4001", `<${node.name}> is not a ${kind} element.`, node);
      return undefined;
    }
    return elements[node.local];
  };

  const checkAttributes = (node: ThemeNode, def: ElementDef): void => {
    for (const attribute of Object.values(node.attributes)) {
      const { name, local, prefix, uri, value } = attribute;
      if (isIgnored(prefix)) continue;
      if (node === root && name === "ignorable") continue;
      if (local.startsWith("on")) {
        report("E4021", `${name} is reserved for events.`, node);
      } else if (local === "transition") {
        report("E4024", `${name} is reserved for animations.`, node);
      } else if (uri !== "" || !Object.hasOwn(def.attributes, local)) {
        report("E4002", `<${node.name}> has no ${name} attribute.`, node);
      } else {
        const found = checkValue(value, def.attributes[local]);
        if (found !== undefined) {
          report(found.code, `${name}: ${found.message}`, node);
        }
      }
    }
    for (const [name, attributeDef] of Object.entries(def.attributes)) {
      if (attributeDef.required && !Object.hasOwn(node.attributes, name)) {
        report("E4003", `<${node.name}> needs a ${name} attribute.`, node);
      }
    }
  };

  const checkChildren = (
    node: ThemeNode,
    def: ElementDef,
    children: readonly ThemeNode[]
  ): void => {
    const { min, max, allowed } = def.children;
    if (children.length < min || (max !== null && children.length > max)) {
      const range =
        max === null
          ? `at least ${min}`
          : min === max
            ? `${min}`
            : `${min}–${max}`;
      report(
        "E4009",
        `<${node.name}> has ${children.length} children; it takes ${range}.`,
        node
      );
    }
    if (node === root && isTheme && Array.isArray(allowed)) {
      checkSections(node, children, allowed);
    }
    for (const child of children) {
      if (child.uri !== THEME_NAMESPACE) continue;
      if (!Object.hasOwn(elements, child.local)) continue;
      const childDef = elements[child.local];
      const listed =
        allowed === "layout"
          ? childDef.category !== ElementCategory.Root
          : allowed.includes(child.local);
      const parentOk =
        childDef.parents === undefined || childDef.parents.includes(node.local);
      if (!listed || !parentOk) {
        report(
          "E4008",
          `<${child.name}> is not allowed inside <${node.name}>.`,
          child
        );
      }
    }
  };

  const checkSections = (
    node: ThemeNode,
    children: readonly ThemeNode[],
    order: readonly string[]
  ): void => {
    let last = -1;
    const seen = new Set<number>();
    for (const child of children) {
      const index = order.indexOf(child.local);
      if (child.uri !== THEME_NAMESPACE || index === -1) continue;
      const repeated = seen.has(index);
      seen.add(index);
      if (index <= last) {
        report(
          "E4012",
          repeated
            ? `<${child.name}> appears more than once.`
            : `<${child.name}> must come before <${order[last]}>.`,
          child
        );
        continue;
      }
      last = index;
    }
    if (!children.some((child) => child.local === "Palettes")) {
      report("E4009", `<${node.name}> needs a <Palettes> section.`, node);
    }
  };

  if (!isIgnored(root.prefix)) visit(root);
  return issues;
}
