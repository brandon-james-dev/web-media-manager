import {
  PLUGIN_MANIFEST_FILE,
  type PluginKind,
  type PluginSettingDescriptor,
  type VisualizerPluginManifest,
} from "../contracts/PluginManifest";
import {
  getRuntimeDescriptor,
  isVisualizerRuntime,
} from "../contracts/VisualizerRuntime";

/**
 * Manifest validation.
 *
 * Runs before anything is written to storage, so an installed plugin is always
 * loadable: the runtime exists, the entry file is present with an extension the
 * runtime can execute, and every declared setting has a usable default.
 */
export type ManifestIssueSeverity = "error" | "warning";

export type ManifestIssueCode =
  | "manifest-missing"
  | "manifest-invalid-json"
  | "manifest-not-object"
  | "id-invalid"
  | "name-missing"
  | "version-invalid"
  | "runtime-unknown"
  | "runtime-unsupported"
  | "entry-missing"
  | "entry-not-in-archive"
  | "entry-extension-mismatch"
  | "thumbnail-not-in-archive"
  | "vertex-not-in-archive"
  | "vertex-unused"
  | "kind-invalid"
  | "settings-invalid"
  | "archive-invalid"
  | "already-installed";

export interface ManifestIssue {
  code: ManifestIssueCode;
  severity: ManifestIssueSeverity;
  message: string;
  field?: string;
}

export interface ManifestValidationResult {
  valid: boolean;
  manifest?: VisualizerPluginManifest;
  issues: ManifestIssue[];
}

const PLUGIN_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const SETTING_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const PLUGIN_KINDS: readonly PluginKind[] = ["visualizer", "theme", "layout"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function hasExtension(path: string, extensions: readonly string[]): boolean {
  const lower = path.toLowerCase();
  return extensions.some((extension) => lower.endsWith(extension));
}

function validateSettings(
  raw: unknown,
  issues: ManifestIssue[]
): PluginSettingDescriptor[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    issues.push({
      code: "settings-invalid",
      severity: "error",
      field: "settings",
      message: "`settings` must be an array of setting descriptors.",
    });
    return undefined;
  }

  const descriptors: PluginSettingDescriptor[] = [];
  const keys = new Set<string>();

  for (const [index, entry] of raw.entries()) {
    const field = `settings[${index}]`;
    if (!isRecord(entry)) {
      issues.push({
        code: "settings-invalid",
        severity: "error",
        field,
        message: `${field} must be an object.`,
      });
      continue;
    }

    const key = readString(entry, "key");
    const label = readString(entry, "label");
    const type = readString(entry, "type");

    if (!key || !SETTING_KEY_PATTERN.test(key)) {
      issues.push({
        code: "settings-invalid",
        severity: "error",
        field,
        message: `${field}.key must start with a letter and contain only letters, digits, "_" or "-".`,
      });
      continue;
    }
    if (keys.has(key)) {
      issues.push({
        code: "settings-invalid",
        severity: "error",
        field,
        message: `Setting key "${key}" is declared more than once.`,
      });
      continue;
    }
    keys.add(key);

    if (!label) {
      issues.push({
        code: "settings-invalid",
        severity: "error",
        field,
        message: `${field}.label is required.`,
      });
      continue;
    }

    const description = readString(entry, "description");
    const base = { key, label, ...(description ? { description } : {}) };

    switch (type) {
      case "number": {
        const fallback = entry.default;
        if (typeof fallback !== "number" || !Number.isFinite(fallback)) {
          issues.push({
            code: "settings-invalid",
            severity: "error",
            field,
            message: `${field}.default must be a number.`,
          });
          continue;
        }
        const min = typeof entry.min === "number" ? entry.min : undefined;
        const max = typeof entry.max === "number" ? entry.max : undefined;
        if (min !== undefined && max !== undefined && min > max) {
          issues.push({
            code: "settings-invalid",
            severity: "error",
            field,
            message: `${field}.min must not exceed ${field}.max.`,
          });
          continue;
        }
        descriptors.push({
          ...base,
          type: "number",
          default: fallback,
          ...(min !== undefined ? { min } : {}),
          ...(max !== undefined ? { max } : {}),
          ...(typeof entry.step === "number" ? { step: entry.step } : {}),
        });
        break;
      }
      case "boolean": {
        if (typeof entry.default !== "boolean") {
          issues.push({
            code: "settings-invalid",
            severity: "error",
            field,
            message: `${field}.default must be a boolean.`,
          });
          continue;
        }
        descriptors.push({ ...base, type: "boolean", default: entry.default });
        break;
      }
      case "select": {
        const options = Array.isArray(entry.options)
          ? entry.options.filter(
              (option): option is { value: string; label: string } =>
                isRecord(option) &&
                typeof option.value === "string" &&
                typeof option.label === "string"
            )
          : [];
        if (options.length === 0) {
          issues.push({
            code: "settings-invalid",
            severity: "error",
            field,
            message: `${field}.options must list at least one { value, label }.`,
          });
          continue;
        }
        if (
          typeof entry.default !== "string" ||
          !options.some((option) => option.value === entry.default)
        ) {
          issues.push({
            code: "settings-invalid",
            severity: "error",
            field,
            message: `${field}.default must match one of its options.`,
          });
          continue;
        }
        descriptors.push({
          ...base,
          type: "select",
          default: entry.default,
          options,
        });
        break;
      }
      case "color": {
        if (
          typeof entry.default !== "string" ||
          !COLOR_PATTERN.test(entry.default)
        ) {
          issues.push({
            code: "settings-invalid",
            severity: "error",
            field,
            message: `${field}.default must be a #rrggbb color.`,
          });
          continue;
        }
        descriptors.push({ ...base, type: "color", default: entry.default });
        break;
      }
      case "string": {
        if (typeof entry.default !== "string") {
          issues.push({
            code: "settings-invalid",
            severity: "error",
            field,
            message: `${field}.default must be a string.`,
          });
          continue;
        }
        descriptors.push({
          ...base,
          type: "string",
          default: entry.default,
          ...(typeof entry.maxLength === "number"
            ? { maxLength: entry.maxLength }
            : {}),
        });
        break;
      }
      default:
        issues.push({
          code: "settings-invalid",
          severity: "error",
          field,
          message: `${field}.type must be one of number, boolean, select, color, string.`,
        });
    }
  }

  return descriptors;
}

export function validatePluginManifest(
  raw: unknown,
  archivePaths: readonly string[]
): ManifestValidationResult {
  const issues: ManifestIssue[] = [];

  if (!isRecord(raw)) {
    return {
      valid: false,
      issues: [
        {
          code: "manifest-not-object",
          severity: "error",
          message: `${PLUGIN_MANIFEST_FILE} must contain a JSON object.`,
        },
      ],
    };
  }

  const id = readString(raw, "id");
  if (!id || !PLUGIN_ID_PATTERN.test(id)) {
    issues.push({
      code: "id-invalid",
      severity: "error",
      field: "id",
      message:
        "`id` must be a lowercase slug (letters, digits, dots, dashes, underscores).",
    });
  }

  const name = readString(raw, "name");
  if (!name) {
    issues.push({
      code: "name-missing",
      severity: "error",
      field: "name",
      message: "`name` is required.",
    });
  }

  const version = readString(raw, "version");
  if (!version || !VERSION_PATTERN.test(version)) {
    issues.push({
      code: "version-invalid",
      severity: "error",
      field: "version",
      message: "`version` must be a semantic version such as 1.0.0.",
    });
  }

  const runtimeValue = readString(raw, "runtime");
  const runtime =
    runtimeValue && isVisualizerRuntime(runtimeValue)
      ? runtimeValue
      : undefined;
  if (!runtime) {
    issues.push({
      code: "runtime-unknown",
      severity: "error",
      field: "runtime",
      message:
        "`runtime` must be one of webgl-shader, canvas2d-typescript, wasm.",
    });
  } else if (!getRuntimeDescriptor(runtime)?.implemented) {
    issues.push({
      code: "runtime-unsupported",
      severity: "error",
      field: "runtime",
      message: `The "${runtime}" runtime is not available in this version of the app.`,
    });
  }

  const entry = readString(raw, "entry");
  if (!entry) {
    issues.push({
      code: "entry-missing",
      severity: "error",
      field: "entry",
      message: "`entry` is required.",
    });
  } else if (!archivePaths.includes(entry)) {
    issues.push({
      code: "entry-not-in-archive",
      severity: "error",
      field: "entry",
      message: `The entry file "${entry}" is not in the archive.`,
    });
  } else if (runtime) {
    const extensions = getRuntimeDescriptor(runtime)?.entryExtensions ?? [];
    if (!hasExtension(entry, extensions)) {
      issues.push({
        code: "entry-extension-mismatch",
        severity: "error",
        field: "entry",
        message: `"${entry}" is not a ${runtime} entry (expected ${extensions.join(", ")}).`,
      });
    }
  }

  const thumbnail = readString(raw, "thumbnail");
  if (thumbnail && !archivePaths.includes(thumbnail)) {
    issues.push({
      code: "thumbnail-not-in-archive",
      severity: "warning",
      field: "thumbnail",
      message: `The thumbnail "${thumbnail}" is not in the archive.`,
    });
  }

  const vertex = readString(raw, "vertex");
  if (vertex && !archivePaths.includes(vertex)) {
    issues.push({
      code: "vertex-not-in-archive",
      severity: "error",
      field: "vertex",
      message: `The vertex shader "${vertex}" is not in the archive.`,
    });
  }
  if (vertex && runtime && runtime !== "webgl-shader") {
    issues.push({
      code: "vertex-unused",
      severity: "warning",
      field: "vertex",
      message: "`vertex` is only used by the webgl-shader runtime.",
    });
  }

  const kindValue = readString(raw, "kind");
  if (
    kindValue &&
    !PLUGIN_KINDS.includes(kindValue as PluginKind)
  ) {
    issues.push({
      code: "kind-invalid",
      severity: "error",
      field: "kind",
      message: "`kind` must be one of visualizer, theme, layout.",
    });
  }

  const settings = validateSettings(raw.settings, issues);

  const valid = !issues.some((issue) => issue.severity === "error");
  if (!valid || !id || !name || !version || !runtime || !entry) {
    return { valid: false, issues };
  }

  const manifest: VisualizerPluginManifest = {
    id,
    name,
    version,
    runtime,
    entry,
    ...(thumbnail ? { thumbnail } : {}),
    ...(vertex ? { vertex } : {}),
    ...(readString(raw, "author") ? { author: readString(raw, "author") } : {}),
    ...(readString(raw, "description")
      ? { description: readString(raw, "description") }
      : {}),
    ...(readString(raw, "homepage")
      ? { homepage: readString(raw, "homepage") }
      : {}),
    ...(readString(raw, "license")
      ? { license: readString(raw, "license") }
      : {}),
    ...(kindValue ? { kind: kindValue as PluginKind } : {}),
    ...(settings ? { settings } : {}),
  };

  return { valid: true, manifest, issues };
}

export function parsePluginManifestJson(
  text: string,
  archivePaths: readonly string[]
): ManifestValidationResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      valid: false,
      issues: [
        {
          code: "manifest-invalid-json",
          severity: "error",
          message: `${PLUGIN_MANIFEST_FILE} is not valid JSON.`,
        },
      ],
    };
  }

  return validatePluginManifest(raw, archivePaths);
}
