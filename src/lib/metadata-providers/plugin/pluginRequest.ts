import type { PluginMetadataAuthDescriptor } from "@/core/plugins";
import { expandHeaders, expandTemplate } from "@/lib/plugins";
import { getPluginSettingSecret } from "@/lib/secrets/pluginSettingSecrets";
import { getPluginManager } from "@/lib/plugins";

/** Reads a dot path out of a parsed JSON value. */
export function readPath(record: unknown, path: string): unknown {
  let current: unknown = record;
  for (const segment of path.split(".")) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Reads a non-empty string at a dot path. */
export function readStringField(
  record: unknown,
  key: string | undefined
): string | undefined {
  if (!key) return undefined;
  const value = readPath(record, key);
  return typeof value === "string" && value.trim() ? value : undefined;
}

/** Reads a finite number at a dot path. */
export function readNumberField(
  record: unknown,
  key: string | undefined
): number | undefined {
  if (!key) return undefined;
  const value = readPath(record, key);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Reads a year at a dot path.
 *
 * Providers disagree on the shape: some send `1987`, others a full date like
 * `1987-01-01`. A number is taken as-is; a string contributes its leading four
 * digits, so a release date maps to the year the editor shows.
 */
export function readYearField(
  record: unknown,
  key: string | undefined
): number | undefined {
  if (!key) return undefined;
  const value = readPath(record, key);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const match = /^(\d{4})/.exec(value.trim());
  return match ? Number(match[1]) : undefined;
}

/**
 * Values a header template can reference: every declared setting, with a
 * secret read from the encrypted store rather than the settings row.
 */
export async function pluginSettingValues(
  pluginId: string | undefined
): Promise<Record<string, string | undefined>> {
  if (!pluginId) {
    return {};
  }

  const manager = getPluginManager();
  const plugin = await manager.get(pluginId);
  const settings = await manager.getSettings(pluginId);
  const values: Record<string, string | undefined> = {};

  for (const descriptor of plugin?.manifest.settings ?? []) {
    if (descriptor.type === "string" && descriptor.secret) {
      values[descriptor.key] =
        (await getPluginSettingSecret(pluginId, descriptor.key)) ?? undefined;
      continue;
    }

    const value = settings[descriptor.key];
    if (value !== undefined) {
      values[descriptor.key] = String(value);
    }
  }

  return values;
}

/**
 * Exchange the plugin's credentials for a token and return the header to
 * send it in. Returns undefined when the descriptor declares no `auth`.
 */
export async function resolvePluginAuthHeader(
  auth: PluginMetadataAuthDescriptor | undefined,
  providerName: string,
  values: Record<string, string | undefined>
): Promise<{ header: string; value: string } | undefined> {
  if (!auth) {
    return undefined;
  }

  const method = auth.method ?? "POST";
  const body = auth.body ? expandTemplate(auth.body, values) : undefined;
  const response = await fetch(auth.url, {
    method,
    headers: expandHeaders(auth.headers, values),
    ...(body !== undefined ? { body } : {}),
  });

  if (!response.ok) {
    throw new Error(`${providerName} token request failed (${response.status})`);
  }

  const data: unknown = await response.json();
  const token = readPath(data, auth.tokenPath);
  if (typeof token !== "string" || !token) {
    throw new Error(
      `${providerName} token response has no "${auth.tokenPath}".`
    );
  }

  return {
    header: auth.header ?? "Authorization",
    value: `${auth.prefix ?? "Bearer "}${token}`,
  };
}

/** Build a request URL from mapped query fields plus literal parameters. */
export function buildPluginUrl(
  baseUrl: string,
  params: Record<string, string>,
  query: Record<string, string> | undefined
): string {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
