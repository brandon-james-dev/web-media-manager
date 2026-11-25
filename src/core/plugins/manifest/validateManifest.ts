import {
  PLUGIN_MANIFEST_FILE,
  type PluginKind,
  type PluginSettingDescriptor,
  type VisualizerPluginManifest,
} from "../contracts/PluginManifest";
import type {
  PluginAlbumFieldMap,
  PluginAlbumSearchDescriptor,
  PluginAlbumTrackFieldMap,
  PluginLyricsFieldMap,
  PluginLyricsProviderDescriptor,
  PluginLyricsQueryField,
  PluginMetadataFieldMap,
  PluginMetadataAuthDescriptor,
  PluginMetadataDetailDescriptor,
  PluginMetadataDetailFieldMap,
  PluginMetadataProviderDescriptor,
  PluginMetadataQueryField,
  PluginProviderDescriptor,
  PluginSourceConfigField,
  PluginSourceFieldMap,
  PluginSourceProviderDescriptor,
} from "../contracts/PluginProvider";
import {
  getRuntimeDescriptor,
  isVisualizerRuntime,
  type VisualizerRuntime,
} from "@/core/visualizers/contracts/VisualizerRuntime";

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
  | "provider-missing"
  | "provider-invalid"
  | "settings-invalid"
  | "archive-invalid"
  | "already-installed"
  | "kind-mismatch";

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
const PLUGIN_KINDS: readonly PluginKind[] = [
  "visualizer",
  "theme",
  "layout",
  "lyrics",
  "source",
  "metadata",
];

const LYRICS_QUERY_FIELDS: readonly PluginLyricsQueryField[] = [
  "title",
  "artist",
  "album",
  "duration",
];

const LYRICS_FIELD_KEYS: readonly (keyof PluginLyricsFieldMap)[] = [
  "id",
  "title",
  "artist",
  "album",
  "duration",
  "plainLyrics",
  "syncedLyrics",
  "hasWordSync",
  "instrumental",
];

const SOURCE_FIELD_KEYS: readonly (keyof PluginSourceFieldMap)[] = [
  "id",
  "title",
  "artist",
  "album",
  "albumArtist",
  "duration",
  "track",
  "discNumber",
  "genre",
  "year",
  "bitrate",
  "fileSize",
  "path",
  "streamUrl",
  "coverArtUrl",
];

const METADATA_QUERY_FIELDS: readonly PluginMetadataQueryField[] = [
  "title",
  "artist",
  "album",
];

const METADATA_FIELD_KEYS: readonly (keyof PluginMetadataFieldMap)[] = [
  "title",
  "artist",
  "album",
  "albumArtist",
  "genre",
  "year",
  "date",
  "track",
  "discNumber",
  "totalTracks",
  "totalDiscs",
  "duration",
  "isrc",
  "label",
  "composer",
  "coverArtUrl",
];

const SOURCE_REQUIRED_FIELDS: readonly (keyof PluginSourceFieldMap)[] = [
  "id",
  "title",
  "artist",
];

const ALBUM_FIELD_KEYS: readonly (keyof PluginAlbumFieldMap)[] = [
  "id",
  "title",
  "artist",
  "albumArtist",
  "year",
  "genre",
  "trackCount",
  "coverArtUrl",
];

const ALBUM_TRACK_FIELD_KEYS: readonly (keyof PluginAlbumTrackFieldMap)[] = [
  "title",
  "track",
  "discNumber",
];

/** True when a URL is absolute https, or a template over `{baseUrl}`. */
function isHttpsOrTemplateUrl(url: string): boolean {
  return url.startsWith("https://") || url.includes("{baseUrl}");
}

function validateSourceConfig(
  raw: unknown,
  issues: ManifestIssue[]
): PluginSourceConfigField[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.config",
      message: "`provider.config` must be an array of field descriptors.",
    });
    return undefined;
  }

  const fields: PluginSourceConfigField[] = [];
  const keys = new Set<string>();

  for (const [index, entry] of raw.entries()) {
    const field = `provider.config[${index}]`;
    if (!isRecord(entry)) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field,
        message: `${field} must be an object.`,
      });
      continue;
    }

    const key = readString(entry, "key");
    const label = readString(entry, "label");
    if (!key || !SETTING_KEY_PATTERN.test(key)) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field,
        message: `${field}.key must start with a letter and contain only letters, digits, "_" or "-".`,
      });
      continue;
    }
    if (keys.has(key)) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field,
        message: `Config key "${key}" is declared more than once.`,
      });
      continue;
    }
    keys.add(key);

    if (!label) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field,
        message: `${field}.label is required.`,
      });
      continue;
    }

    const placeholder = readString(entry, "placeholder");
    fields.push({
      key,
      label,
      ...(placeholder ? { placeholder } : {}),
      ...(entry.required === true ? { required: true } : {}),
      ...(entry.secret === true ? { secret: true } : {}),
    });
  }

  return fields.length ? fields : undefined;
}

function validateSourceProvider(
  raw: Record<string, unknown>,
  issues: ManifestIssue[]
): PluginSourceProviderDescriptor | undefined {
  const id = readString(raw, "id");
  if (!id || !PLUGIN_ID_PATTERN.test(id)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.id",
      message:
        "`provider.id` must be a lowercase slug (letters, digits, dots, dashes, underscores).",
    });
  }

  const name = readString(raw, "name");
  if (!name) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.name",
      message: "`provider.name` is required.",
    });
  }

  const config = validateSourceConfig(raw.config, issues);

  const library = raw.library;
  if (!isRecord(library)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.library",
      message: "`provider.library` must be an object.",
    });
    return undefined;
  }

  const libraryUrl = readString(library, "url");
  if (!libraryUrl || !isHttpsOrTemplateUrl(libraryUrl)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.library.url",
      message:
        "`provider.library.url` must be an absolute https:// URL or a template using {baseUrl}.",
    });
  }

  const libraryHeaders = readHeaders(
    library.headers,
    "provider.library.headers",
    issues
  );
  const resultsPath = readString(library, "resultsPath");
  const recordTag = readString(library, "recordTag");
  const body = readString(library, "body");

  let method: "GET" | "PROPFIND" | undefined;
  if (library.method !== undefined) {
    if (library.method !== "GET" && library.method !== "PROPFIND") {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.library.method",
        message: "`provider.library.method` must be GET or PROPFIND.",
      });
    } else {
      method = library.method;
    }
  }

  const fieldsRaw = library.fields;
  if (!isRecord(fieldsRaw)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.library.fields",
      message: "`provider.library.fields` must be an object.",
    });
    return undefined;
  }

  const fields: Partial<PluginSourceFieldMap> = {};
  for (const key of SOURCE_FIELD_KEYS) {
    const value = fieldsRaw[key];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: `provider.library.fields.${key}`,
        message: "Each mapped field must be a non-empty JSON field name.",
      });
    } else {
      fields[key] = value.trim();
    }
  }

  for (const key of SOURCE_REQUIRED_FIELDS) {
    if (!fields[key]) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: `provider.library.fields.${key}`,
        message: `\`provider.library.fields.${key}\` is required.`,
      });
    }
  }

  let stream: PluginSourceProviderDescriptor["stream"];
  if (raw.stream !== undefined) {
    if (!isRecord(raw.stream)) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.stream",
        message: "`provider.stream` must be an object.",
      });
    } else {
      const streamUrl = readString(raw.stream, "url");
      if (!streamUrl || !isHttpsOrTemplateUrl(streamUrl)) {
        issues.push({
          code: "provider-invalid",
          severity: "error",
          field: "provider.stream.url",
          message:
            "`provider.stream.url` must be an absolute https:// URL or a template using {baseUrl}.",
        });
      } else {
        const headers = readHeaders(
          raw.stream.headers,
          "provider.stream.headers",
          issues
        );
        stream = { url: streamUrl, ...(headers ? { headers } : {}) };
      }
    }
  }

  if (
    !id ||
    !name ||
    !libraryUrl ||
    !SOURCE_REQUIRED_FIELDS.every((key) => fields[key])
  ) {
    return undefined;
  }

  const description = readString(raw, "description");

  return {
    id,
    name,
    ...(description ? { description } : {}),
    ...(config ? { config } : {}),
    library: {
      url: libraryUrl,
      ...(method ? { method } : {}),
      ...(body ? { body } : {}),
      ...(libraryHeaders ? { headers: libraryHeaders } : {}),
      ...(resultsPath ? { resultsPath } : {}),
      ...(recordTag ? { recordTag } : {}),
      fields: fields as PluginSourceFieldMap,
    },
    ...(stream ? { stream } : {}),
  };
}

/** Read a header map, reporting a non-string value per entry. */
function readHeaders(
  raw: unknown,
  field: string,
  issues: ManifestIssue[]
): Record<string, string> | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!isRecord(raw)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field,
      message: `\`${field}\` must be an object.`,
    });
    return undefined;
  }

  const headers: Record<string, string> = {};
  for (const [header, value] of Object.entries(raw)) {
    if (typeof value !== "string") {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: `${field}.${header}`,
        message: "Each header value must be a string.",
      });
    } else {
      headers[header] = value;
    }
  }
  return Object.keys(headers).length ? headers : undefined;
}

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

function validateProvider(
  raw: unknown,
  kind: PluginKind,
  issues: ManifestIssue[]
): PluginProviderDescriptor | undefined {
  if (raw === undefined) {
    if (kind === "lyrics" || kind === "source" || kind === "metadata") {
      issues.push({
        code: "provider-missing",
        severity: "error",
        field: "provider",
        message: `\`provider\` is required for ${kind} plugins.`,
      });
    }
    return undefined;
  }

  if (!isRecord(raw)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider",
      message: "`provider` must be an object.",
    });
    return undefined;
  }

  if (kind === "source") {
    return validateSourceProvider(raw, issues);
  }

  if (kind === "metadata") {
    return validateMetadataProvider(raw, issues);
  }

  return validateLyricsProvider(raw, issues);
}

function validateLyricsProvider(
  raw: Record<string, unknown>,
  issues: ManifestIssue[]
): PluginLyricsProviderDescriptor | undefined {
  const id = readString(raw, "id");
  if (!id || !PLUGIN_ID_PATTERN.test(id)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.id",
      message:
        "`provider.id` must be a lowercase slug (letters, digits, dots, dashes, underscores).",
    });
  }

  const name = readString(raw, "name");
  if (!name) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.name",
      message: "`provider.name` is required.",
    });
  }

  const search = raw.search;
  if (!isRecord(search)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.search",
      message: "`provider.search` must be an object.",
    });
    return undefined;
  }

  const url = readString(search, "url");
  if (!url || !url.startsWith("https://")) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.search.url",
      message: "`provider.search.url` must be an absolute https:// URL.",
    });
  }

  const params: Partial<Record<PluginLyricsQueryField, string>> = {};
  if (search.params !== undefined) {
    if (!isRecord(search.params)) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.search.params",
        message: "`provider.search.params` must be an object.",
      });
    } else {
      for (const [field, value] of Object.entries(search.params)) {
        if (!LYRICS_QUERY_FIELDS.includes(field as PluginLyricsQueryField)) {
          issues.push({
            code: "provider-invalid",
            severity: "error",
            field: `provider.search.params.${field}`,
            message: `Unknown query field "${field}"; expected ${LYRICS_QUERY_FIELDS.join(", ")}.`,
          });
        } else if (typeof value !== "string" || !value.trim()) {
          issues.push({
            code: "provider-invalid",
            severity: "error",
            field: `provider.search.params.${field}`,
            message: "Each parameter name must be a non-empty string.",
          });
        } else {
          params[field as PluginLyricsQueryField] = value.trim();
        }
      }
    }
  }

  const headers: Record<string, string> = {};
  if (search.headers !== undefined) {
    if (!isRecord(search.headers)) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.search.headers",
        message: "`provider.search.headers` must be an object.",
      });
    } else {
      for (const [header, value] of Object.entries(search.headers)) {
        if (typeof value !== "string") {
          issues.push({
            code: "provider-invalid",
            severity: "error",
            field: `provider.search.headers.${header}`,
            message: "Each header value must be a string.",
          });
        } else {
          headers[header] = value;
        }
      }
    }
  }

  const resultsPath = readString(search, "resultsPath");

  const fieldsRaw = search.fields;
  if (!isRecord(fieldsRaw)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.search.fields",
      message: "`provider.search.fields` must be an object.",
    });
    return undefined;
  }

  const fields: Partial<PluginLyricsFieldMap> = {};
  for (const key of LYRICS_FIELD_KEYS) {
    const value = fieldsRaw[key];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: `provider.search.fields.${key}`,
        message: "Each mapped field must be a non-empty JSON field name.",
      });
    } else {
      fields[key] = value.trim();
    }
  }

  if (!fields.title) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.search.fields.title",
      message: "`provider.search.fields.title` is required.",
    });
  }
  if (!fields.artist) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.search.fields.artist",
      message: "`provider.search.fields.artist` is required.",
    });
  }

  if (!id || !name || !url || !fields.title || !fields.artist) {
    return undefined;
  }

  return {
    id,
    name,
    search: {
      url,
      ...(Object.keys(params).length ? { params } : {}),
      ...(Object.keys(headers).length ? { headers } : {}),
      ...(resultsPath ? { resultsPath } : {}),
      fields: fields as PluginLyricsFieldMap,
    },
  };
}

/** Validate the optional album-lookup block on a metadata provider. */
function validateAlbumSearch(
  raw: unknown,
  issues: ManifestIssue[]
): PluginAlbumSearchDescriptor | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!isRecord(raw)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.albumSearch",
      message: "`provider.albumSearch` must be an object.",
    });
    return undefined;
  }

  const url = readString(raw, "url");
  if (!url || !url.startsWith("https://")) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.albumSearch.url",
      message: "`provider.albumSearch.url` must be an absolute https:// URL.",
    });
  }

  const params: Partial<Record<PluginMetadataQueryField, string>> = {};
  if (raw.params !== undefined) {
    if (!isRecord(raw.params)) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.albumSearch.params",
        message: "`provider.albumSearch.params` must be an object.",
      });
    } else {
      for (const [field, value] of Object.entries(raw.params)) {
        if (!METADATA_QUERY_FIELDS.includes(field as PluginMetadataQueryField)) {
          issues.push({
            code: "provider-invalid",
            severity: "error",
            field: `provider.albumSearch.params.${field}`,
            message: `Unknown query field "${field}"; expected ${METADATA_QUERY_FIELDS.join(", ")}.`,
          });
        } else if (typeof value !== "string" || !value.trim()) {
          issues.push({
            code: "provider-invalid",
            severity: "error",
            field: `provider.albumSearch.params.${field}`,
            message: "Each parameter name must be a non-empty string.",
          });
        } else {
          params[field as PluginMetadataQueryField] = value.trim();
        }
      }
    }
  }

  const query = readStringRecord(raw.query, "provider.albumSearch.query", issues);
  const headers = readStringRecord(
    raw.headers,
    "provider.albumSearch.headers",
    issues
  );

  let method: "GET" | "POST" | undefined;
  if (raw.method !== undefined) {
    if (raw.method !== "GET" && raw.method !== "POST") {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.albumSearch.method",
        message: "`provider.albumSearch.method` must be GET or POST.",
      });
    } else {
      method = raw.method;
    }
  }

  const body = readString(raw, "body");
  const resultsPath = readString(raw, "resultsPath");

  const fieldsRaw = raw.fields;
  if (!isRecord(fieldsRaw)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.albumSearch.fields",
      message: "`provider.albumSearch.fields` must be an object.",
    });
    return undefined;
  }

  const fields: Partial<PluginAlbumFieldMap> = {};
  for (const key of ALBUM_FIELD_KEYS) {
    const value = fieldsRaw[key];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: `provider.albumSearch.fields.${key}`,
        message: "Each mapped field must be a non-empty JSON field name.",
      });
    } else {
      fields[key] = value.trim();
    }
  }

  if (!fields.title) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.albumSearch.fields.title",
      message: "`provider.albumSearch.fields.title` is required.",
    });
  }
  if (!fields.id) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.albumSearch.fields.id",
      message: "`provider.albumSearch.fields.id` is required.",
    });
  }

  let detail: PluginAlbumSearchDescriptor["detail"];
  if (raw.detail !== undefined) {
    if (!isRecord(raw.detail)) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.albumSearch.detail",
        message: "`provider.albumSearch.detail` must be an object.",
      });
    } else {
      const detailUrl = readString(raw.detail, "url");
      if (!detailUrl || !detailUrl.startsWith("https://")) {
        issues.push({
          code: "provider-invalid",
          severity: "error",
          field: "provider.albumSearch.detail.url",
          message:
            "`provider.albumSearch.detail.url` must be an absolute https:// URL.",
        });
      }
      const detailFieldsRaw = raw.detail.fields;
      if (!isRecord(detailFieldsRaw)) {
        issues.push({
          code: "provider-invalid",
          severity: "error",
          field: "provider.albumSearch.detail.fields",
          message: "`provider.albumSearch.detail.fields` must be an object.",
        });
      } else {
        const detailFields: Record<string, string> = {};
        for (const [key, value] of Object.entries(detailFieldsRaw)) {
          if (typeof value !== "string" || !value.trim()) {
            issues.push({
              code: "provider-invalid",
              severity: "error",
              field: `provider.albumSearch.detail.fields.${key}`,
              message: `\`provider.albumSearch.detail.fields.${key}\` must be a non-empty string.`,
            });
            continue;
          }
          detailFields[key] = value.trim();
        }
        detail = {
          url: detailUrl ?? "",
          fields: detailFields as NonNullable<
            PluginAlbumSearchDescriptor["detail"]
          >["fields"],
        };
      }
    }
  }

  let tracks: PluginAlbumSearchDescriptor["tracks"];  if (raw.tracks !== undefined) {
    if (!isRecord(raw.tracks)) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.albumSearch.tracks",
        message: "`provider.albumSearch.tracks` must be an object.",
      });
    } else {
      const trackUrl = readString(raw.tracks, "url");
      if (!trackUrl || !trackUrl.startsWith("https://")) {
        issues.push({
          code: "provider-invalid",
          severity: "error",
          field: "provider.albumSearch.tracks.url",
          message:
            "`provider.albumSearch.tracks.url` must be an absolute https:// URL.",
        });
      }

      const trackFieldsRaw = raw.tracks.fields;
      const trackFields: Partial<PluginAlbumTrackFieldMap> = {};
      if (!isRecord(trackFieldsRaw)) {
        issues.push({
          code: "provider-invalid",
          severity: "error",
          field: "provider.albumSearch.tracks.fields",
          message: "`provider.albumSearch.tracks.fields` must be an object.",
        });
      } else {
        for (const key of ALBUM_TRACK_FIELD_KEYS) {
          const value = trackFieldsRaw[key];
          if (value === undefined) {
            continue;
          }
          if (typeof value !== "string" || !value.trim()) {
            issues.push({
              code: "provider-invalid",
              severity: "error",
              field: `provider.albumSearch.tracks.fields.${key}`,
              message: "Each mapped field must be a non-empty JSON field name.",
            });
          } else {
            trackFields[key] = value.trim();
          }
        }
        if (!trackFields.title) {
          issues.push({
            code: "provider-invalid",
            severity: "error",
            field: "provider.albumSearch.tracks.fields.title",
            message: "`provider.albumSearch.tracks.fields.title` is required.",
          });
        }
      }

      if (trackUrl && trackFields.title) {
        tracks = {
          url: trackUrl,
          ...(Object.keys(
            readStringRecord(
              raw.tracks.query,
              "provider.albumSearch.tracks.query",
              issues
            )
          ).length
            ? {
                query: readStringRecord(
                  raw.tracks.query,
                  "provider.albumSearch.tracks.query",
                  issues
                ),
              }
            : {}),
          ...(Object.keys(
            readStringRecord(
              raw.tracks.headers,
              "provider.albumSearch.tracks.headers",
              issues
            )
          ).length
            ? {
                headers: readStringRecord(
                  raw.tracks.headers,
                  "provider.albumSearch.tracks.headers",
                  issues
                ),
              }
            : {}),
          ...(readString(raw.tracks, "resultsPath")
            ? { resultsPath: readString(raw.tracks, "resultsPath") as string }
            : {}),
          fields: trackFields as PluginAlbumTrackFieldMap,
        };
      }
    }
  }

  if (!url || !fields.title || !fields.id) {
    return undefined;
  }

  return {
    url,
    ...(Object.keys(params).length ? { params } : {}),
    ...(Object.keys(query).length ? { query } : {}),
    ...(method ? { method } : {}),
    ...(body ? { body } : {}),
    ...(Object.keys(headers).length ? { headers } : {}),
    ...(resultsPath ? { resultsPath } : {}),
    fields: fields as PluginAlbumFieldMap,
    ...(detail ? { detail } : {}),
    ...(tracks ? { tracks } : {}),
  };
}

/** Read an optional `Record<string, string>` block, reporting bad values. */
function readStringRecord(
  raw: unknown,
  field: string,
  issues: ManifestIssue[]
): Record<string, string> {
  const result: Record<string, string> = {};
  if (raw === undefined) {
    return result;
  }
  if (!isRecord(raw)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field,
      message: `\`${field}\` must be an object.`,
    });
    return result;
  }
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "string") {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: `${field}.${key}`,
        message: "Each value must be a string.",
      });
    } else {
      result[key] = value;
    }
  }
  return result;
}

function validateMetadataProvider(
  raw: Record<string, unknown>,
  issues: ManifestIssue[]
): PluginMetadataProviderDescriptor | undefined {
  const id = readString(raw, "id");
  if (!id || !PLUGIN_ID_PATTERN.test(id)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.id",
      message:
        "`provider.id` must be a lowercase slug (letters, digits, dots, dashes, underscores).",
    });
  }

  const name = readString(raw, "name");
  if (!name) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.name",
      message: "`provider.name` is required.",
    });
  }

  const description = readString(raw, "description");

  const search = raw.search;
  if (!isRecord(search)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.search",
      message: "`provider.search` must be an object.",
    });
    return undefined;
  }

  const url = readString(search, "url");
  if (!url || !url.startsWith("https://")) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.search.url",
      message: "`provider.search.url` must be an absolute https:// URL.",
    });
  }

  const params: Partial<Record<PluginMetadataQueryField, string>> = {};
  if (search.params !== undefined) {
    if (!isRecord(search.params)) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.search.params",
        message: "`provider.search.params` must be an object.",
      });
    } else {
      for (const [field, value] of Object.entries(search.params)) {
        if (!METADATA_QUERY_FIELDS.includes(field as PluginMetadataQueryField)) {
          issues.push({
            code: "provider-invalid",
            severity: "error",
            field: `provider.search.params.${field}`,
            message: `Unknown query field "${field}"; expected ${METADATA_QUERY_FIELDS.join(", ")}.`,
          });
        } else if (typeof value !== "string" || !value.trim()) {
          issues.push({
            code: "provider-invalid",
            severity: "error",
            field: `provider.search.params.${field}`,
            message: "Each parameter name must be a non-empty string.",
          });
        } else {
          params[field as PluginMetadataQueryField] = value.trim();
        }
      }
    }
  }

  const query: Record<string, string> = {};
  if (search.query !== undefined) {
    if (!isRecord(search.query)) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.search.query",
        message: "`provider.search.query` must be an object.",
      });
    } else {
      for (const [key, value] of Object.entries(search.query)) {
        if (typeof value !== "string") {
          issues.push({
            code: "provider-invalid",
            severity: "error",
            field: `provider.search.query.${key}`,
            message: "Each literal query value must be a string.",
          });
        } else {
          query[key] = value;
        }
      }
    }
  }

  let searchMethod: "GET" | "POST" | undefined;
  if (search.method !== undefined) {
    if (search.method !== "GET" && search.method !== "POST") {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.search.method",
        message: "`provider.search.method` must be GET or POST.",
      });
    } else {
      searchMethod = search.method;
    }
  }

  const searchBody = readString(search, "body");

  const headers: Record<string, string> = {};
  if (search.headers !== undefined) {
    if (!isRecord(search.headers)) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.search.headers",
        message: "`provider.search.headers` must be an object.",
      });
    } else {
      for (const [header, value] of Object.entries(search.headers)) {
        if (typeof value !== "string") {
          issues.push({
            code: "provider-invalid",
            severity: "error",
            field: `provider.search.headers.${header}`,
            message: "Each header value must be a string.",
          });
        } else {
          headers[header] = value;
        }
      }
    }
  }

  const resultsPath = readString(search, "resultsPath");

  const fieldsRaw = search.fields;
  if (!isRecord(fieldsRaw)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.search.fields",
      message: "`provider.search.fields` must be an object.",
    });
    return undefined;
  }

  const fields: Partial<PluginMetadataFieldMap> = {};
  for (const key of METADATA_FIELD_KEYS) {
    const value = fieldsRaw[key];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: `provider.search.fields.${key}`,
        message: "Each mapped field must be a non-empty JSON field name.",
      });
    } else {
      fields[key] = value.trim();
    }
  }

  if (!fields.title) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.search.fields.title",
      message: "`provider.search.fields.title` is required.",
    });
  }
  if (!fields.artist) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.search.fields.artist",
      message: "`provider.search.fields.artist` is required.",
    });
  }

  const auth = validateMetadataAuth(raw.auth, issues);
  const albumSearch = validateAlbumSearch(raw.albumSearch, issues);
  const detail = validateMetadataDetail(search.detail, issues);

  if (!id || !name || !url || !fields.title || !fields.artist) {
    return undefined;
  }

  return {
    role: "metadata",
    id,
    name,
    ...(description ? { description } : {}),
    ...(albumSearch ? { albumSearch } : {}),
    search: {
      url,
      ...(Object.keys(params).length ? { params } : {}),
      ...(Object.keys(query).length ? { query } : {}),
      ...(searchMethod ? { method: searchMethod } : {}),
      ...(searchBody ? { body: searchBody } : {}),
      ...(Object.keys(headers).length ? { headers } : {}),
      ...(resultsPath ? { resultsPath } : {}),
      fields: fields as PluginMetadataFieldMap,
      ...(detail ? { detail } : {}),
    },
    ...(auth ? { auth } : {}),
  };
}

/** Validate the optional per-record detail request on a metadata provider. */
function validateMetadataDetail(
  raw: unknown,
  issues: ManifestIssue[]
): PluginMetadataDetailDescriptor | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!isRecord(raw)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.search.detail",
      message: "`provider.search.detail` must be an object.",
    });
    return undefined;
  }

  const url = readString(raw, "url");
  if (!url || !url.startsWith("https://")) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.search.detail.url",
      message: "`provider.search.detail.url` must be an absolute https:// URL.",
    });
  }

  const headers: Record<string, string> = {};
  if (raw.headers !== undefined) {
    if (!isRecord(raw.headers)) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.search.detail.headers",
        message: "`provider.search.detail.headers` must be an object.",
      });
    } else {
      for (const [header, value] of Object.entries(raw.headers)) {
        if (typeof value !== "string") {
          issues.push({
            code: "provider-invalid",
            severity: "error",
            field: `provider.search.detail.headers.${header}`,
            message: "Each header value must be a string.",
          });
        } else {
          headers[header] = value;
        }
      }
    }
  }

  const fieldsRaw = raw.fields;
  if (!isRecord(fieldsRaw)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.search.detail.fields",
      message: "`provider.search.detail.fields` must be an object.",
    });
    return undefined;
  }

  const fields: Partial<PluginMetadataDetailFieldMap> = {};
  for (const key of METADATA_FIELD_KEYS) {
    if (key === "title" || key === "artist") {
      continue;
    }
    const value = fieldsRaw[key];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: `provider.search.detail.fields.${key}`,
        message: "Each mapped field must be a non-empty JSON field name.",
      });
    } else {
      fields[key] = value.trim();
    }
  }

  if (!url) {
    return undefined;
  }

  return {
    url,
    ...(Object.keys(headers).length ? { headers } : {}),
    fields,
  };
}

/** Validate the optional token-exchange block on a metadata provider. */
function validateMetadataAuth(
  raw: unknown,
  issues: ManifestIssue[]
): PluginMetadataAuthDescriptor | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!isRecord(raw)) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.auth",
      message: "`provider.auth` must be an object.",
    });
    return undefined;
  }

  const url = readString(raw, "url");
  if (!url || !url.startsWith("https://")) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.auth.url",
      message: "`provider.auth.url` must be an absolute https:// URL.",
    });
  }

  let method: "GET" | "POST" | undefined;
  if (raw.method !== undefined) {
    if (raw.method !== "GET" && raw.method !== "POST") {
      issues.push({
        code: "provider-invalid",
        severity: "error",
        field: "provider.auth.method",
        message: "`provider.auth.method` must be GET or POST.",
      });
    } else {
      method = raw.method;
    }
  }

  const headers = readHeaders(raw.headers, "provider.auth.headers", issues);
  const body = readString(raw, "body");

  const tokenPath = readString(raw, "tokenPath");
  if (!tokenPath) {
    issues.push({
      code: "provider-invalid",
      severity: "error",
      field: "provider.auth.tokenPath",
      message: "`provider.auth.tokenPath` is required.",
    });
  }

  const header = readString(raw, "header");
  const prefix = readString(raw, "prefix");

  if (!url || !tokenPath) {
    return undefined;
  }

  return {
    url,
    ...(method ? { method } : {}),
    ...(headers ? { headers } : {}),
    ...(body ? { body } : {}),
    tokenPath,
    ...(header ? { header } : {}),
    ...(prefix !== undefined ? { prefix } : {}),
  };
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

  const kindValue = readString(raw, "kind");
  let kind: PluginKind = "visualizer";
  if (kindValue) {
    if (!PLUGIN_KINDS.includes(kindValue as PluginKind)) {
      issues.push({
        code: "kind-invalid",
        severity: "error",
        field: "kind",
        message:
          "`kind` must be one of visualizer, theme, layout, lyrics, source.",
      });
    } else {
      kind = kindValue as PluginKind;
    }
  }
  const executable = kind === "visualizer";

  const runtimeValue = readString(raw, "runtime");
  let runtime: VisualizerRuntime | undefined;
  if (runtimeValue) {
    if (!isVisualizerRuntime(runtimeValue)) {
      issues.push({
        code: "runtime-unknown",
        severity: "error",
        field: "runtime",
        message:
          "`runtime` must be one of webgl-shader, canvas2d-typescript, wasm.",
      });
    } else if (!getRuntimeDescriptor(runtimeValue)?.implemented) {
      issues.push({
        code: "runtime-unsupported",
        severity: "error",
        field: "runtime",
        message: `The "${runtimeValue}" runtime is not available in this version of the app.`,
      });
    } else {
      runtime = runtimeValue;
    }
  } else if (executable) {
    issues.push({
      code: "runtime-unknown",
      severity: "error",
      field: "runtime",
      message: "`runtime` is required for visualizer plugins.",
    });
  }

  const entry = readString(raw, "entry");
  if (!entry) {
    if (executable) {
      issues.push({
        code: "entry-missing",
        severity: "error",
        field: "entry",
        message: "`entry` is required for visualizer plugins.",
      });
    }
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

  const provider = validateProvider(raw.provider, kind, issues);

  const settings = validateSettings(raw.settings, issues);

  const valid = !issues.some((issue) => issue.severity === "error");
  if (!valid || !id || !name || !version) {
    return { valid: false, issues };
  }
  if (executable && (!runtime || !entry)) {
    return { valid: false, issues };
  }

  const manifest: VisualizerPluginManifest = {
    id,
    name,
    version,
    ...(runtime ? { runtime } : {}),
    ...(entry ? { entry } : {}),
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
    kind,
    ...(provider ? { provider } : {}),
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
