import type { FormFactor } from "../componentModel";
import { compileTheme } from "../ir";
import type { ThemeIR } from "../ir";
import { IssueSeverity } from "../issues";
import type { ThemeIssue } from "../issues";
import { checkArchive, checkManifest } from "../package";
import type { ThemeManifest } from "../package";
import { parseThemeXml } from "../parser";
import type { ThemeNode } from "../parser";
import { checkLayout, checkTheme, walkElements } from "../validator";
import type { ThemeLayout } from "../validator";

/**
 * Options for {@link validateThemePackage}.
 *
 * @example
 * ```json
 * { "app": { "min": "0.9.0" } }
 * ```
 * @example
 * ```ts
 * validateThemePackage(zipBytes, { appVersion: "0.9.2" });
 * ```
 */
export interface ValidateThemeOptions {
  appVersion?: string;
}

/**
 * The outcome of a full package validation. `manifest`, `files` and `ir`
 * are set only when no stage reported an error.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const result = validateThemePackage(zipBytes);
 * if (result.ir) install(result.manifest!, result.files!, result.ir);
 * ```
 */
export interface ThemeValidationResult {
  manifest?: ThemeManifest;
  files?: Map<string, Uint8Array>;
  ir?: ThemeIR;
  issues: ThemeIssue[];
}

function hasErrors(issues: readonly ThemeIssue[]): boolean {
  return issues.some((issue) => issue.severity === IssueSeverity.Error);
}

function decode(
  bytes: Uint8Array,
  file: string,
  issues: ThemeIssue[]
): string | undefined {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    issues.push({
      code: "E3001",
      severity: IssueSeverity.Error,
      file,
      message: "The file is not valid UTF-8.",
    });
    return undefined;
  }
}

function parseFile(
  files: ReadonlyMap<string, Uint8Array>,
  file: string,
  root: "Theme" | "Layout",
  spec: string,
  issues: ThemeIssue[]
): ThemeNode | undefined {
  const bytes = files.get(file);
  if (bytes === undefined) return undefined;
  const xml = decode(bytes, file, issues);
  if (xml === undefined) return undefined;
  const result = parseThemeXml(xml, { file, root, spec });
  issues.push(...result.issues);
  return result.root;
}

/**
 * Runs every validation stage on a theme ZIP and compiles it: archive,
 * manifest, XML, grammar, semantics, then the IR. Each stage runs only when
 * the previous ones had no errors, and every issue found is returned.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0">
 *   <Palettes>
 *     <Palette scheme="dark">
 *       <Set slot="background" value="#0b1a3a" />
 *     </Palette>
 *   </Palettes>
 * </Theme>
 * ```
 * @example
 * ```ts
 * const { ir, issues } = validateThemePackage(await file.arrayBuffer(), {
 *   appVersion: "0.9.2",
 * });
 * ```
 */
export function validateThemePackage(
  input: ArrayBuffer | Uint8Array,
  options: ValidateThemeOptions = {}
): ThemeValidationResult {
  const issues: ThemeIssue[] = [];

  const archive = checkArchive(input);
  issues.push(...archive.issues);
  if (hasErrors(issues)) return { issues };

  const { manifest, issues: manifestIssues } = checkManifest(
    archive.files,
    options.appVersion
  );
  issues.push(...manifestIssues);
  if (manifest === undefined || hasErrors(issues)) return { issues };

  const theme = parseFile(
    archive.files,
    "theme.xml",
    "Theme",
    manifest.spec,
    issues
  );
  const layouts: (ThemeLayout & { formFactor: FormFactor })[] = [];
  for (const formFactor of manifest.formFactors) {
    const file = `layouts/${formFactor}.xml`;
    const root = parseFile(
      archive.files,
      file,
      "Layout",
      manifest.spec,
      issues
    );
    if (root !== undefined) layouts.push({ formFactor, root, file });
  }
  if (theme === undefined || hasErrors(issues)) return { issues };

  issues.push(...walkElements(theme, "theme.xml"));
  for (const layout of layouts) {
    issues.push(...walkElements(layout.root, layout.file));
  }
  if (hasErrors(issues)) return { issues };

  issues.push(...checkTheme(theme, "theme.xml", layouts));
  for (const layout of layouts) {
    issues.push(...checkLayout(layout.root, layout.file));
  }
  if (hasErrors(issues)) return { issues };

  const compiled = compileTheme({ manifest, theme, layouts });
  issues.push(...compiled.issues);
  if (compiled.ir === undefined || hasErrors(issues)) return { issues };

  return { manifest, files: archive.files, ir: compiled.ir, issues };
}
