export const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Compares two SemVer versions by major, minor and patch, ignoring
 * pre-release and build parts. Negative when `left` is older.
 *
 * @example
 * ```json
 * { "version": "1.2.0", "app": { "min": "0.9.0" } }
 * ```
 * @example
 * ```ts
 * compareVersions("1.2.0", "1.10.0") < 0; // true
 * ```
 */
export function compareVersions(left: string, right: string): number {
  const parse = (value: string) =>
    value.split(/[-+]/)[0].split(".").map(Number);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}
