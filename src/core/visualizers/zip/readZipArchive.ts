import { unzipSync } from "fflate";

/**
 * ZIP reading for plugin archives.
 *
 * A plugin ZIP is untrusted input: it may be huge, contain thousands of
 * entries, or use paths that escape the plugin's own namespace. This reader
 * enforces limits and normalizes paths before anything reaches storage, so the
 * rest of the system only ever sees safe, archive-relative paths.
 */
export interface PluginArchiveEntry {
  path: string;
  bytes: Uint8Array;
  size: number;
}

export interface ReadZipOptions {
  maxEntries?: number;
  maxEntryBytes?: number;
  maxTotalBytes?: number;
  /** Strip a single wrapping folder (`alchemy/fragment.glsl` -> `fragment.glsl`). */
  stripCommonRoot?: boolean;
}

export const DEFAULT_ZIP_LIMITS = {
  maxEntries: 512,
  maxEntryBytes: 8 * 1024 * 1024,
  maxTotalBytes: 32 * 1024 * 1024,
} as const;

export type PluginArchiveErrorCode =
  | "empty-archive"
  | "invalid-archive"
  | "too-many-entries"
  | "entry-too-large"
  | "archive-too-large"
  | "unsafe-path"
  | "duplicate-path";

export class PluginArchiveError extends Error {
  readonly code: PluginArchiveErrorCode;

  constructor(code: PluginArchiveErrorCode, message: string) {
    super(message);
    this.name = "PluginArchiveError";
    this.code = code;
  }
}

/** Archive junk that never belongs to a plugin. */
function isIgnoredPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  return (
    normalized.startsWith("__MACOSX/") ||
    normalized.endsWith("/.DS_Store") ||
    normalized === ".DS_Store"
  );
}

function normalizeEntryPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "");

  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized)
  ) {
    throw new PluginArchiveError(
      "unsafe-path",
      `The archive contains an absolute path: "${path}".`
    );
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => segment === ".." || segment === "")) {
    throw new PluginArchiveError(
      "unsafe-path",
      `The archive contains an unsafe path: "${path}".`
    );
  }

  return normalized;
}

function stripCommonRoot(entries: PluginArchiveEntry[]): PluginArchiveEntry[] {
  if (entries.length === 0) {
    return entries;
  }

  const roots = new Set<string>();
  for (const entry of entries) {
    const segments = entry.path.split("/");
    if (segments.length < 2) {
      return entries;
    }
    roots.add(segments[0]);
  }

  if (roots.size !== 1) {
    return entries;
  }

  const [root] = roots;
  return entries.map((entry) => ({
    ...entry,
    path: entry.path.slice(root.length + 1),
  }));
}

export function readZipArchive(
  input: ArrayBuffer | Uint8Array,
  options: ReadZipOptions = {}
): PluginArchiveEntry[] {
  const maxEntries = options.maxEntries ?? DEFAULT_ZIP_LIMITS.maxEntries;
  const maxEntryBytes = options.maxEntryBytes ?? DEFAULT_ZIP_LIMITS.maxEntryBytes;
  const maxTotalBytes = options.maxTotalBytes ?? DEFAULT_ZIP_LIMITS.maxTotalBytes;
  const stripRoot = options.stripCommonRoot ?? true;

  const data = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (data.byteLength === 0) {
    throw new PluginArchiveError("empty-archive", "The ZIP file is empty.");
  }

  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(data, {
      filter: (file) => {
        if (file.name.endsWith("/") || isIgnoredPath(file.name)) {
          return false;
        }
        if (file.originalSize > maxEntryBytes) {
          throw new PluginArchiveError(
            "entry-too-large",
            `"${file.name}" is larger than the ${maxEntryBytes} byte per-file limit.`
          );
        }
        return true;
      },
    });
  } catch (error) {
    if (error instanceof PluginArchiveError) {
      throw error;
    }
    throw new PluginArchiveError(
      "invalid-archive",
      "The file is not a readable ZIP archive."
    );
  }

  const paths = Object.keys(unzipped);
  if (paths.length === 0) {
    throw new PluginArchiveError(
      "empty-archive",
      "The ZIP file contains no files."
    );
  }
  if (paths.length > maxEntries) {
    throw new PluginArchiveError(
      "too-many-entries",
      `The archive contains ${paths.length} files; the limit is ${maxEntries}.`
    );
  }

  const seen = new Set<string>();
  let entries: PluginArchiveEntry[] = [];

  for (const path of paths) {
    const normalized = normalizeEntryPath(path);
    if (seen.has(normalized)) {
      throw new PluginArchiveError(
        "duplicate-path",
        `The archive contains "${normalized}" more than once.`
      );
    }
    seen.add(normalized);

    const bytes = unzipped[path];
    entries.push({ path: normalized, bytes, size: bytes.byteLength });
  }

  if (stripRoot) {
    entries = stripCommonRoot(entries);
  }

  const totalBytes = entries.reduce((total, entry) => total + entry.size, 0);
  if (totalBytes > maxTotalBytes) {
    throw new PluginArchiveError(
      "archive-too-large",
      `The archive expands to ${totalBytes} bytes; the limit is ${maxTotalBytes}.`
    );
  }

  return entries.sort((a, b) => a.path.localeCompare(b.path));
}
