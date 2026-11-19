import type { IRNode, ThemeIR } from "../../../ir";
import { themeClassName } from "../styleClassNames";

/** The class map of one style table, keyed by author id. */
export function classMap(
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
export function defaultClass(
  classes: Record<string, string>,
  id: string | undefined,
  builtin: string
): string {
  if (id === undefined) return builtin;
  return classes[id] ?? builtin;
}

/** The ids of a style table in stable order. */
export function sortedIds(table: Record<string, unknown>): string[] {
  return Object.keys(table).sort();
}

/** One CSS rule with its declarations in insertion order. */
export function rule(
  selector: string,
  declarations: Record<string, string>
): string {
  const body = Object.entries(declarations)
    .map(([name, value]) => `${name}:${value};`)
    .join("");
  return `${selector}{${body}}`;
}

/** Visits every node of a layout tree with its stable depth-first index. */
export function walk(
  node: IRNode,
  path: string,
  visit: (node: IRNode, path: string) => void
): void {
  visit(node, path);
  node.children.forEach((child, index) => {
    walk(child, `${path}.${index}`, visit);
  });
}
