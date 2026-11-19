import { SaxesParser } from "saxes";
import type { SaxesTagNS } from "saxes";
import { IssueSeverity } from "@/lib/themes/issues";
import type { ThemeIssue } from "@/lib/themes/issues";
import { assignPaths } from "./assignPaths";
import { checkRoot } from "./checkRoot";
import { XMLNS_URI } from "./constants";
import { tagStart } from "./tagStart";
import type { ParseOptions, ParseResult, ThemeNode } from "./types";
import { XML_LIMITS } from "./xmlLimits";

/**
 * Parses a `theme.xml` or layout document into a {@link ThemeNode} tree and
 * runs the stage 3 (`3xxx`) checks: well-formedness, no `DOCTYPE`, no
 * processing instructions, UTF-8, depth, element and attribute-length caps,
 * no text content, root element and namespace, and `spec` against the
 * manifest. Every issue in the stage is collected.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
 *   <Shell><PageHost /></Shell>
 * </Layout>
 * ```
 * @example
 * ```ts
 * const { root, issues } = parseThemeXml(xml, {
 *   file: "layouts/desktop.xml",
 *   root: "Layout",
 *   spec: "1.0",
 * });
 * ```
 */
export function parseThemeXml(xml: string, options: ParseOptions): ParseResult {
  const { file } = options;
  const lines = xml.split(/\r\n|\r|\n/);
  const issues: ThemeIssue[] = [];
  const stack: ThemeNode[] = [];
  const starts: { line: number; column: number }[] = [];
  let root: ThemeNode | undefined;
  let elementCount = 0;
  let depthReported = false;

  const parser = new SaxesParser({ xmlns: true, position: true });

  const report = (
    code: string,
    message: string,
    at: { line: number; column: number } = {
      line: parser.line,
      column: parser.column + 1,
    },
    path?: string
  ) => {
    issues.push({
      code,
      severity: IssueSeverity.Error,
      file,
      line: at.line,
      column: at.column,
      path,
      message,
    });
  };

  parser.on("error", (err) => {
    report("E3001", err.message.replace(/^\d+:\d+: /, ""));
  });

  parser.on("doctype", () => {
    report("E3002", "DOCTYPE declarations are not allowed.");
  });

  parser.on("processinginstruction", (pi) => {
    report("E3003", `Processing instruction "${pi.target}" is not allowed.`);
  });

  parser.on("xmldecl", (decl) => {
    if (decl.encoding && decl.encoding.toLowerCase() !== "utf-8") {
      report("E3004", `Encoding "${decl.encoding}" is not allowed; use UTF-8.`);
    }
  });

  parser.on("text", (text) => {
    if (stack.length > 0 && text.trim().length > 0) {
      report("E3008", "Text content is not allowed.");
    }
  });

  parser.on("cdata", () => {
    report("E3008", "CDATA sections are not allowed.");
  });

  parser.on("opentagstart", (tag) => {
    starts.push(tagStart(lines, parser.line, parser.column, tag.name));
  });

  parser.on("opentag", (tag: SaxesTagNS) => {
    const at = starts.pop() ?? { line: parser.line, column: 1 };
    const node: ThemeNode = {
      name: tag.name,
      local: tag.local,
      prefix: tag.prefix,
      uri: tag.uri,
      attributes: {},
      children: [],
      line: at.line,
      column: at.column,
      path: "",
    };
    for (const attr of Object.values(tag.attributes)) {
      if (attr.uri === XMLNS_URI) continue;
      node.attributes[attr.name] = {
        name: attr.name,
        local: attr.local,
        prefix: attr.prefix,
        uri: attr.uri,
        value: attr.value,
      };
      if (attr.value.length > XML_LIMITS.maxAttributeLength) {
        report(
          "E3007",
          `Attribute "${attr.name}" is longer than ${XML_LIMITS.maxAttributeLength} characters.`,
          at
        );
      }
    }

    elementCount += 1;
    if (elementCount === XML_LIMITS.maxElements + 1) {
      report(
        "E3006",
        `More than ${XML_LIMITS.maxElements} elements in one file.`,
        at
      );
    }
    if (stack.length + 1 > XML_LIMITS.maxDepth && !depthReported) {
      depthReported = true;
      report(
        "E3005",
        `Elements are nested deeper than ${XML_LIMITS.maxDepth} levels.`,
        at
      );
    }

    const parent = stack.at(-1);
    if (parent) parent.children.push(node);
    else root = node;
    stack.push(node);
  });

  parser.on("closetag", () => {
    stack.pop();
  });

  parser.write(xml).close();

  if (root) {
    assignPaths(root, `/${root.name}`);
    checkRoot(root, options, report);
  }

  const hasErrors = issues.some((i) => i.severity === IssueSeverity.Error);
  return { root: hasErrors ? undefined : root, issues };
}
