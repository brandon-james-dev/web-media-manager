import { PackageArchiveError, readZipArchive } from "@/lib/packages";
import type { PackageArchiveErrorCode } from "@/lib/packages";
import { SEMVER_PATTERN, compareVersions } from "@/lib/packages";
import { FormFactor } from "../componentModel";
import { IssueSeverity } from "@/lib/themes/issues";
import type { ThemeIssue } from "@/lib/themes/issues";

/**
 * The spec version this host implements. A manifest `spec` with a higher
 * minor is refused (`E2010`), and any other major is refused (`E2011`).
 *
 * @example
 * ```json
 * { "kind": "theme", "spec": "1.0" }
 * ```
 * @example
 * ```ts
 * `${HOST_SPEC.major}.${HOST_SPEC.minor}`; // "1.0"
 * ```
 */
export const HOST_SPEC = { major: 1, minor: 0 } as const;

/**
 * Size and count limits from `05-validation.md`, in bytes and characters.
 *
 * @example
 * ```json
 * { "previews": ["previews/desktop.png"] }
 * ```
 * @example
 * ```ts
 * PACKAGE_LIMITS.imageBytes; // 20 MB
 * ```
 */
export const PACKAGE_LIMITS = {
  zipBytes: 50 * 1024 * 1024,
  totalBytes: 100 * 1024 * 1024,
  files: 2000,
  imageBytes: 20 * 1024 * 1024,
  fontBytes: 2 * 1024 * 1024,
  xmlBytes: 1024 * 1024,
  manifestBytes: 64 * 1024,
  compressionRatio: 100,
  pathLength: 200,
  pathDepth: 6,
} as const;

/**
 * Package files that must exist (`E1008`). Layout files are optional, so a
 * theme with only `theme.xml` recolors the built-in UI.
 *
 * @example
 * ```json
 * { "formFactors": [] }
 * ```
 * @example
 * ```ts
 * REQUIRED_FILES.includes("layouts/desktop.xml"); // false
 * ```
 */
const REQUIRED_FILES = ["manifest.json", "theme.xml"];

/**
 * Root files allowed besides the folders, with their byte limit.
 *
 * @example
 * ```json
 * { "license": "SEE LICENSE IN LICENSE" }
 * ```
 * @example
 * ```ts
 * ROOT_FILES["README.md"]; // 1 MB
 * ```
 */
const ROOT_FILES: Readonly<Record<string, number>> = {
  "manifest.json": PACKAGE_LIMITS.manifestBytes,
  "theme.xml": PACKAGE_LIMITS.xmlBytes,
  LICENSE: PACKAGE_LIMITS.xmlBytes,
  "README.md": PACKAGE_LIMITS.xmlBytes,
};

/**
 * Folders whose files are stored when their extension is allowed
 * (`E1004` otherwise), with the per-file byte limit.
 *
 * @example
 * ```json
 * { "thumbnail": "previews/thumb.png" }
 * ```
 * @example
 * ```ts
 * ASSET_FOLDERS[1].extensions; // ["woff2", "woff", "ttf", "otf"]
 * ```
 */
const ASSET_FOLDERS: readonly {
  prefix: string;
  extensions: readonly string[];
  maxBytes: number;
}[] = [
  {
    prefix: "assets/images/",
    extensions: ["png", "jpg", "jpeg", "webp", "gif", "svg"],
    maxBytes: PACKAGE_LIMITS.imageBytes,
  },
  {
    prefix: "assets/fonts/",
    extensions: ["woff2", "woff", "ttf", "otf"],
    maxBytes: PACKAGE_LIMITS.fontBytes,
  },
  {
    prefix: "previews/",
    extensions: ["png", "jpg", "jpeg", "webp"],
    maxBytes: PACKAGE_LIMITS.imageBytes,
  },
];

/**
 * Archive reader failures mapped to issue codes.
 *
 * @example
 * ```json
 * { "id": "classic-blue" }
 * ```
 * @example
 * ```ts
 * ARCHIVE_ERROR_CODES["unsafe-path"]; // "E1005"
 * ```
 */
const ARCHIVE_ERROR_CODES: Readonly<Record<PackageArchiveErrorCode, string>> = {
  "empty-archive": "E1001",
  "invalid-archive": "E1001",
  "too-many-entries": "E1002",
  "entry-too-large": "E1002",
  "archive-too-large": "E1002",
  "unsafe-path": "E1005",
  "duplicate-path": "E1006",
};

/**
 * Manifest fields reserved for later versions (`E2002`).
 *
 * @example
 * ```json
 * { "extends": "classic-blue" }
 * ```
 * @example
 * ```ts
 * RESERVED_FIELDS.includes("scripts"); // true
 * ```
 */
const RESERVED_FIELDS = [
  "entry",
  "layouts",
  "requires",
  "dependencies",
  "extends",
  "permissions",
  "scripts",
  "bindings",
];

/**
 * Manifest fields defined by spec 1.0. Others get `I2001`.
 *
 * @example
 * ```json
 * { "honorsUserAccent": true }
 * ```
 * @example
 * ```ts
 * KNOWN_FIELDS.includes("tags"); // true
 * ```
 */
const KNOWN_FIELDS = [
  "$schema",
  "kind",
  "spec",
  "id",
  "name",
  "version",
  "description",
  "author",
  "license",
  "homepage",
  "app",
  "formFactors",
  "colorSchemes",
  "honorsUserAccent",
  "previews",
  "thumbnail",
  "tags",
];

const ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const TAG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SPEC_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const COLOR_SCHEMES = ["light", "dark"] as const;
const FORM_FACTORS: readonly string[] = Object.values(FormFactor);
const MANIFEST_FILE = "manifest.json";

/**
 * A light or dark palette scheme a theme supports.
 *
 * @example
 * ```xml
 * <Palette scheme="dark" />
 * ```
 * @example
 * ```ts
 * const scheme: ColorScheme = "dark";
 * ```
 */
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

/**
 * A validated `manifest.json`, with defaults applied.
 *
 * @example
 * ```json
 * { "kind": "theme", "spec": "1.0", "id": "classic-blue", "name": "Classic Blue",
 *   "version": "1.2.0", "formFactors": ["desktop"], "colorSchemes": ["dark"] }
 * ```
 * @example
 * ```ts
 * manifest.honorsUserAccent; // false when omitted
 * ```
 */
export interface ThemeManifest {
  kind: "theme";
  spec: string;
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: { name?: string; url?: string };
  license?: string;
  homepage?: string;
  app?: { min?: string };
  formFactors: FormFactor[];
  colorSchemes: ColorScheme[];
  honorsUserAccent: boolean;
  previews: string[];
  thumbnail?: string;
  tags: string[];
}

/**
 * The stored files of a package after stage 1, keyed by package path.
 *
 * @example
 * ```xml
 * <Image id="logo" src="assets/images/logo.png" />
 * ```
 * @example
 * ```ts
 * const { files, issues } = checkArchive(zipBytes);
 * files.get("theme.xml");
 * ```
 */
export interface ThemeArchive {
  files: Map<string, Uint8Array>;
  issues: ThemeIssue[];
}

/**
 * The result of stage 2. `manifest` is set only when there are no errors.
 *
 * @example
 * ```json
 * { "kind": "theme", "spec": "1.1" }
 * ```
 * @example
 * ```ts
 * const { manifest, issues } = checkManifest(files);
 * ```
 */
export interface ManifestResult {
  manifest?: ThemeManifest;
  issues: ThemeIssue[];
}

function severityOf(code: string): IssueSeverity {
  if (code.startsWith("E")) return IssueSeverity.Error;
  if (code.startsWith("W")) return IssueSeverity.Warning;
  return IssueSeverity.Info;
}

function makeIssue(
  code: string,
  message: string,
  file: string,
  path?: string
): ThemeIssue {
  return {
    code,
    severity: severityOf(code),
    file,
    ...(path === undefined ? {} : { path }),
    message,
  };
}

function maxBytesOf(path: string): number | "unknown" | "disallowed" {
  if (path in ROOT_FILES) return ROOT_FILES[path];
  if (FORM_FACTORS.some((factor) => path === `layouts/${factor}.xml`)) {
    return PACKAGE_LIMITS.xmlBytes;
  }
  const folder = ASSET_FOLDERS.find((entry) => path.startsWith(entry.prefix));
  if (folder !== undefined) {
    const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
    return folder.extensions.includes(extension)
      ? folder.maxBytes
      : "disallowed";
  }
  return path.startsWith("assets/") ? "disallowed" : "unknown";
}

/**
 * Stage 1: reads a theme ZIP and checks paths, allowed files, extensions and
 * limits. Unknown files are dropped from `files` with `W1003`.
 *
 * @example
 * ```xml
 * <FontFamily id="body"><Face src="assets/fonts/body.woff2" /></FontFamily>
 * ```
 * @example
 * ```ts
 * const { files, issues } = checkArchive(await file.arrayBuffer());
 * ```
 */
export function checkArchive(input: ArrayBuffer | Uint8Array): ThemeArchive {
  const issues: ThemeIssue[] = [];
  const files = new Map<string, Uint8Array>();
  if (input.byteLength > PACKAGE_LIMITS.zipBytes) {
    issues.push(
      makeIssue(
        "E1002",
        `The ZIP is ${input.byteLength} bytes; the limit is ${PACKAGE_LIMITS.zipBytes}.`,
        ""
      )
    );
    return { files, issues };
  }

  let entries;
  try {
    entries = readZipArchive(input, {
      maxEntries: PACKAGE_LIMITS.files,
      maxEntryBytes: PACKAGE_LIMITS.imageBytes,
      maxTotalBytes: PACKAGE_LIMITS.totalBytes,
      maxCompressionRatio: PACKAGE_LIMITS.compressionRatio,
    });
  } catch (error) {
    if (!(error instanceof PackageArchiveError)) throw error;
    issues.push(makeIssue(ARCHIVE_ERROR_CODES[error.code], error.message, ""));
    return { files, issues };
  }

  const folded = new Map<string, string>();
  for (const entry of entries) {
    const { path } = entry;
    const first = folded.get(path.toLowerCase());
    if (first !== undefined) {
      issues.push(
        makeIssue(
          "E1006",
          `"${path}" differs from "${first}" only by letter case.`,
          path
        )
      );
      continue;
    }
    folded.set(path.toLowerCase(), path);

    if (
      path.length > PACKAGE_LIMITS.pathLength ||
      path.split("/").length > PACKAGE_LIMITS.pathDepth
    ) {
      issues.push(
        makeIssue(
          "E1007",
          `The path is longer than ${PACKAGE_LIMITS.pathLength} characters or deeper than ${PACKAGE_LIMITS.pathDepth} levels.`,
          path
        )
      );
      continue;
    }

    const maxBytes = maxBytesOf(path);
    if (maxBytes === "unknown") {
      issues.push(
        makeIssue(
          "W1003",
          "This file is not part of a theme package and is not stored.",
          path
        )
      );
      continue;
    }
    if (maxBytes === "disallowed") {
      issues.push(
        makeIssue(
          "E1004",
          "This file type is not allowed in this folder.",
          path
        )
      );
      continue;
    }
    if (entry.size > maxBytes) {
      issues.push(
        makeIssue(
          "E1002",
          `The file is ${entry.size} bytes; the limit is ${maxBytes}.`,
          path
        )
      );
      continue;
    }
    files.set(path, entry.bytes);
  }

  for (const required of REQUIRED_FILES) {
    if (
      !files.has(required) &&
      !issues.some((item) => item.file === required)
    ) {
      issues.push(makeIssue("E1008", `${required} is missing.`, required));
    }
  }
  return { files, issues };
}

function lengthOf(value: string): number {
  return [...value].length;
}

function isHttpsUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

/**
 * Stage 2: parses and checks `manifest.json` against the stage-1 files.
 * Pass the running app version to get the advisory `app.min` warning
 * (`W2008`).
 *
 * @example
 * ```json
 * { "kind": "theme", "spec": "1.0", "id": "classic-blue", "name": "Classic Blue",
 *   "version": "1.2.0", "app": { "min": "0.9.0" },
 *   "formFactors": ["desktop", "tablet"], "colorSchemes": ["dark"] }
 * ```
 * @example
 * ```ts
 * const { manifest, issues } = checkManifest(files, "0.9.2");
 * ```
 */
export function checkManifest(
  files: ReadonlyMap<string, Uint8Array>,
  appVersion?: string
): ManifestResult {
  const issues: ThemeIssue[] = [];
  const report = (code: string, message: string, field?: string) =>
    issues.push(
      makeIssue(
        code,
        message,
        MANIFEST_FILE,
        field === undefined ? undefined : `/${field}`
      )
    );

  const bytes = files.get(MANIFEST_FILE);
  if (bytes === undefined) {
    report("E1008", `${MANIFEST_FILE} is missing.`);
    return { issues };
  }

  let data: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    data = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    report("E2001", `${MANIFEST_FILE} is not valid UTF-8 JSON.`);
    return { issues };
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    report("E2001", `${MANIFEST_FILE} must contain a JSON object.`);
    return { issues };
  }
  const raw = data as Record<string, unknown>;

  for (const field of Object.keys(raw)) {
    if (RESERVED_FIELDS.includes(field)) {
      report(
        "E2002",
        `"${field}" is reserved for a later spec version.`,
        field
      );
    } else if (!KNOWN_FIELDS.includes(field) && !field.startsWith("x-")) {
      report(
        "I2001",
        `"${field}" is not a spec 1.0 field and is ignored.`,
        field
      );
    }
  }

  const requireString = (field: string): string | undefined => {
    const value = raw[field];
    if (typeof value === "string") return value;
    report(
      "E2004",
      value === undefined
        ? `"${field}" is required.`
        : `"${field}" must be a string.`,
      field
    );
    return undefined;
  };
  const optionalString = (field: string): string | undefined => {
    const value = raw[field];
    if (value === undefined || typeof value === "string") return value;
    report("E2004", `"${field}" must be a string.`, field);
    return undefined;
  };
  const requireList = (field: string): string[] | undefined => {
    const value = raw[field];
    if (isStringArray(value)) return value;
    report(
      "E2004",
      value === undefined
        ? `"${field}" is required.`
        : `"${field}" must be an array of strings.`,
      field
    );
    return undefined;
  };
  const optionalList = (field: string): string[] => {
    const value = raw[field];
    if (value === undefined) return [];
    if (isStringArray(value)) return value;
    report("E2004", `"${field}" must be an array of strings.`, field);
    return [];
  };

  const kind = requireString("kind");
  if (kind !== undefined && kind !== "theme") {
    report("E2005", `"kind" must be "theme".`, "kind");
  }

  const spec = requireString("spec");
  const specMatch = spec === undefined ? null : SPEC_PATTERN.exec(spec);
  if (spec !== undefined && specMatch === null) {
    report("E2005", `"spec" must be MAJOR.MINOR, like "1.0".`, "spec");
  } else if (specMatch !== null) {
    const major = Number(specMatch[1]);
    const minor = Number(specMatch[2]);
    if (major !== HOST_SPEC.major) {
      report(
        "E2011",
        `Spec ${spec} is not supported; this version of Web Media Manager reads spec ${HOST_SPEC.major}.x.`,
        "spec"
      );
    } else if (minor > HOST_SPEC.minor) {
      report(
        "E2010",
        "This theme needs a newer version of Web Media Manager.",
        "spec"
      );
    }
  }

  const id = requireString("id");
  if (id !== undefined) {
    if (!ID_PATTERN.test(id) || id.length < 3 || id.length > 64) {
      report(
        "E2005",
        `"id" must be 3–64 lowercase kebab-case characters starting with a letter.`,
        "id"
      );
    } else if (id.startsWith("wmm-")) {
      report(
        "E2003",
        `The "wmm-" id prefix is reserved for built-in themes.`,
        "id"
      );
    }
  }

  const name = requireString("name");
  if (name !== undefined && (lengthOf(name) < 1 || lengthOf(name) > 64)) {
    report("E2005", `"name" must be 1–64 characters.`, "name");
  }

  const version = requireString("version");
  if (version !== undefined && !SEMVER_PATTERN.test(version)) {
    report("E2005", `"version" must be a SemVer 2.0 version.`, "version");
  }

  const description = optionalString("description");
  if (description !== undefined && lengthOf(description) > 280) {
    report(
      "E2005",
      `"description" must be at most 280 characters.`,
      "description"
    );
  }

  let author: ThemeManifest["author"];
  if (raw.author !== undefined) {
    const value = raw.author as Record<string, unknown>;
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      report("E2004", `"author" must be an object.`, "author");
    } else {
      if (
        value.name !== undefined &&
        (typeof value.name !== "string" || lengthOf(value.name) > 64)
      ) {
        report(
          "E2005",
          `"author.name" must be at most 64 characters.`,
          "author/name"
        );
      }
      if (value.url !== undefined && !isHttpsUrl(value.url)) {
        report("E2005", `"author.url" must be an https: URL.`, "author/url");
      }
      author = {
        ...(typeof value.name === "string" ? { name: value.name } : {}),
        ...(typeof value.url === "string" ? { url: value.url } : {}),
      };
    }
  }

  const license = optionalString("license");
  const homepage = optionalString("homepage");
  if (homepage !== undefined && !isHttpsUrl(homepage)) {
    report("E2005", `"homepage" must be an https: URL.`, "homepage");
  }

  let app: ThemeManifest["app"];
  if (raw.app !== undefined) {
    const value = raw.app as Record<string, unknown>;
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      report("E2004", `"app" must be an object.`, "app");
    } else if (value.min !== undefined) {
      if (typeof value.min !== "string" || !SEMVER_PATTERN.test(value.min)) {
        report("E2005", `"app.min" must be a SemVer 2.0 version.`, "app/min");
      } else {
        app = { min: value.min };
        if (
          appVersion !== undefined &&
          compareVersions(appVersion, value.min) < 0
        ) {
          report(
            "W2008",
            `This theme was made for Web Media Manager ${value.min} or newer and may not look right.`,
            "app/min"
          );
        }
      }
    } else {
      app = {};
    }
  }

  const formFactors = requireList("formFactors");
  if (formFactors !== undefined) {
    const unknown = formFactors.filter((item) => !FORM_FACTORS.includes(item));
    if (unknown.length > 0) {
      report(
        "E2005",
        `"formFactors" contains unknown values: ${unknown.join(", ")}.`,
        "formFactors"
      );
    } else if (new Set(formFactors).size !== formFactors.length) {
      report("E2005", `"formFactors" contains duplicates.`, "formFactors");
    }
    for (const factor of FORM_FACTORS) {
      const layout = `layouts/${factor}.xml`;
      const listed = formFactors.includes(factor);
      if (listed && !files.has(layout)) {
        report(
          "E2006",
          `"${factor}" is listed but ${layout} is missing.`,
          "formFactors"
        );
      } else if (!listed && files.has(layout)) {
        report(
          "W2006",
          `${layout} is present but "${factor}" is not listed, so it is not used.`,
          "formFactors"
        );
      }
    }
  }

  const colorSchemes = requireList("colorSchemes");
  if (colorSchemes !== undefined) {
    const allowed: readonly string[] = COLOR_SCHEMES;
    if (
      colorSchemes.length === 0 ||
      colorSchemes.some((item) => !allowed.includes(item)) ||
      new Set(colorSchemes).size !== colorSchemes.length
    ) {
      report(
        "E2005",
        `"colorSchemes" must be a non-empty set of "light" and "dark".`,
        "colorSchemes"
      );
    }
  }

  const honorsUserAccent = raw.honorsUserAccent ?? false;
  if (typeof honorsUserAccent !== "boolean") {
    report(
      "E2004",
      `"honorsUserAccent" must be true or false.`,
      "honorsUserAccent"
    );
  }

  const previews = optionalList("previews");
  if (
    previews.length > 6 ||
    previews.some((item) => !item.startsWith("previews/"))
  ) {
    report(
      "E2005",
      `"previews" must list at most 6 paths under previews/.`,
      "previews"
    );
  }
  const thumbnail = optionalString("thumbnail");
  if (thumbnail !== undefined && !thumbnail.startsWith("previews/")) {
    report("E2005", `"thumbnail" must be a path under previews/.`, "thumbnail");
  }

  const tags = optionalList("tags");
  if (
    tags.length > 8 ||
    tags.some((tag) => tag.length > 24 || !TAG_PATTERN.test(tag))
  ) {
    report(
      "E2005",
      `"tags" must be at most 8 lowercase kebab-case tags of up to 24 characters.`,
      "tags"
    );
  }

  if (issues.some((item) => item.severity === IssueSeverity.Error)) {
    return { issues };
  }
  return {
    manifest: {
      kind: "theme",
      spec: spec as string,
      id: id as string,
      name: name as string,
      version: version as string,
      ...(description === undefined ? {} : { description }),
      ...(author === undefined ? {} : { author }),
      ...(license === undefined ? {} : { license }),
      ...(homepage === undefined ? {} : { homepage }),
      ...(app === undefined ? {} : { app }),
      formFactors: formFactors as FormFactor[],
      colorSchemes: colorSchemes as ColorScheme[],
      honorsUserAccent: honorsUserAccent as boolean,
      previews,
      ...(thumbnail === undefined ? {} : { thumbnail }),
      tags,
    },
    issues,
  };
}
