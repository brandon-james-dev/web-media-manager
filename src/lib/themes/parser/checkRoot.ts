import { THEME_NAMESPACE } from "../componentModel";
import type { ParseOptions, ReportIssue, ThemeNode } from "./types";

/**
 * Checks the root element: its local name and namespace must match the
 * expected root (E3009), and its `spec` must equal the manifest's (E3010).
 * The `spec` check is skipped when the root itself is wrong.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
 *   <Shell><PageHost /></Shell>
 * </Layout>
 * ```
 * @example
 * ```ts
 * checkRoot(root, { file: "layouts/desktop.xml", root: "Layout", spec: "1.0" }, report);
 * ```
 */
export function checkRoot(
  root: ThemeNode,
  options: ParseOptions,
  report: ReportIssue
): void {
  if (root.local !== options.root || root.uri !== THEME_NAMESPACE) {
    report(
      "E3009",
      `Root element must be <${options.root} xmlns="${THEME_NAMESPACE}">.`,
      root,
      root.path
    );
    return;
  }
  const spec = root.attributes.spec?.value;
  if (spec !== options.spec) {
    report(
      "E3010",
      spec === undefined
        ? `Missing spec; the manifest declares "${options.spec}".`
        : `spec "${spec}" does not match the manifest spec "${options.spec}".`,
      root,
      `${root.path}/@spec`
    );
  }
}
