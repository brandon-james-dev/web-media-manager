/**
 * Substitute `{key}` placeholders in a header value.
 *
 * A plugin declares static headers in its manifest, but a key or token has to
 * come from the user at runtime. Templates keep that value out of the archive:
 * the host resolves each placeholder from the plugin's settings (or a source's
 * config) before the request goes out.
 *
 * `{base64:key}` encodes the resolved value, which is what makes HTTP basic
 * auth expressible without a dedicated field:
 * `"Authorization": "Basic {base64:credentials}"`.
 *
 * An unknown placeholder resolves to an empty string, so a missing setting
 * sends an empty header rather than the literal `{key}`.
 *
 * @example
 * ```ts
 * expandTemplate("Bearer {apiKey}", { apiKey: "abc" }); // "Bearer abc"
 * expandTemplate("Basic {base64:credentials}", { credentials: "u:p" });
 * ```
 */
export function expandTemplate(
  template: string,
  values: Record<string, string | undefined>
): string {
  return template.replace(/\{([^{}]+)\}/g, (_match, token: string) => {
    if (token.startsWith("base64:")) {
      const value = values[token.slice("base64:".length)];
      return value === undefined ? "" : encodeBase64(value);
    }
    return values[token] ?? "";
  });
}

/** Expand every value in a header map, keeping the keys as declared. */
export function expandHeaders(
  headers: Record<string, string> | undefined,
  values: Record<string, string | undefined>
): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }

  const expanded: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    expanded[key] = expandTemplate(value, values);
  }
  return expanded;
}

/** Base64 of the UTF-8 bytes, so a non-ASCII credential still encodes. */
function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
