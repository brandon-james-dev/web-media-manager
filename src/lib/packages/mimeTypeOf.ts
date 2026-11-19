const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
  xml: "application/xml",
  json: "application/json",
  md: "text/markdown",
  glsl: "text/plain",
  frag: "text/plain",
  fs: "text/plain",
  vert: "text/plain",
  js: "text/javascript",
  mjs: "text/javascript",
  ts: "text/typescript",
  wasm: "application/wasm",
};

/**
 * MIME type for a package file, derived from its extension. Paths without an
 * extension and unknown extensions fall back to `application/octet-stream`.
 *
 * @example
 * ```xml
 * <Image id="bg" src="assets/images/bg.webp" />
 * ```
 * @example
 * ```ts
 * mimeTypeOf("assets/images/bg.webp"); // "image/webp"
 * mimeTypeOf("shaders/main.glsl"); // "text/plain"
 * ```
 */
export function mimeTypeOf(path: string): string {
  const dot = path.lastIndexOf(".");
  if (dot === -1) {
    return "application/octet-stream";
  }
  const extension = path.slice(dot + 1).toLowerCase();
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}
