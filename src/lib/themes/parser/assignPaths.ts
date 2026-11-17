import type { ThemeNode } from "./types";

/**
 * Sets `path` on a node and all of its descendants. A 1-based index is
 * added only when siblings share the element's name.
 *
 * @example
 * ```xml
 * <Shell>
 *   <Panel id="sidebar" />
 *   <Panel id="main" />
 *   <PageHost />
 * </Shell>
 * ```
 * @example
 * ```ts
 * assignPaths(root, `/${root.name}`);
 * root.children[0].children[1].path; // "/Layout/Shell/Panel[2]"
 * ```
 */
export function assignPaths(node: ThemeNode, path: string): void {
  node.path = path;
  const counts = new Map<string, number>();
  for (const child of node.children) {
    counts.set(child.name, (counts.get(child.name) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  for (const child of node.children) {
    const index = (seen.get(child.name) ?? 0) + 1;
    seen.set(child.name, index);
    const suffix = (counts.get(child.name) ?? 0) > 1 ? `[${index}]` : "";
    assignPaths(child, `${path}/${child.name}${suffix}`);
  }
}
