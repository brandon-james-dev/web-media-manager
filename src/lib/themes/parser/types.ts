import type { ThemeIssue } from "@/lib/themes/issues";

/**
 * A namespaced attribute of a {@link ThemeNode}. Namespace declarations
 * (`xmlns`, `xmlns:*`) are not included.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const spec = root.attributes.spec?.value;
 * ```
 */
export interface ThemeAttribute {
  name: string;
  local: string;
  prefix: string;
  uri: string;
  value: string;
}

/**
 * An element of a parsed theme document. `line` and `column` are 1-based
 * and point at the element's `<`. `path` addresses the element in issues,
 * with a 1-based index only when siblings share its name.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
 *   <Shell><PageHost /></Shell>
 * </Layout>
 * ```
 * @example
 * ```ts
 * root.children[0].path; // "/Layout/Shell"
 * ```
 */
export interface ThemeNode {
  name: string;
  local: string;
  prefix: string;
  uri: string;
  attributes: Record<string, ThemeAttribute>;
  children: ThemeNode[];
  line: number;
  column: number;
  path: string;
}

/**
 * Options for `parseThemeXml`.
 *
 * @example
 * ```ts
 * const options: ParseOptions = {
 *   file: "layouts/desktop.xml",
 *   root: "Layout",
 *   spec: manifest.spec,
 * };
 * ```
 */
export interface ParseOptions {
  /** Package-relative path used in issues. */
  file: string;
  /** Required root element local name. */
  root: "Theme" | "Layout";
  /** The manifest's `spec`, which the root `spec` must equal. */
  spec: string;
}

/**
 * Result of `parseThemeXml`. `root` is present only when there are no
 * errors.
 *
 * @example
 * ```ts
 * const { root, issues }: ParseResult = parseThemeXml(xml, options);
 * ```
 */
export interface ParseResult {
  root?: ThemeNode;
  issues: ThemeIssue[];
}

/**
 * Callback that records a stage 3 error at a source position and optional
 * element path.
 *
 * @example
 * ```ts
 * report("E3010", 'Missing spec; the manifest declares "1.0".', root, root.path);
 * ```
 */
export type ReportIssue = (
  code: string,
  message: string,
  at: { line: number; column: number },
  path?: string
) => void;
