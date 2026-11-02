/**
 * Resolve a parsed M3U entry path to a relative path for storage, keeping it
 * relative (forward slashes) — e.g. strip a leading `./`, remote URLs are
 * kept as-is (not resolvable to local files).
 */
export function toRelativePlaylistPath(
  entryPath: string,
  _baseDir?: string
): string {
  const p = entryPath.replace(/\\/g, "/");
  if (/^[a-z]+:\/\//i.test(p)) return p; // URL — leave as-is
  if (p.startsWith("/")) return p.slice(1); // absolute local — make relative to base
  return p.replace(/^\.\//, "");
}
