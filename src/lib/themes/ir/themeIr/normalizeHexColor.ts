/**
 * Normalizes a color to lowercase `#rrggbbaa`: `transparent` becomes
 * `#00000000`, `#rgb` is expanded, and `#rrggbb` gains an opaque alpha.
 *
 * @example
 * ```xml
 * <Button foreground="#FFF" background="transparent" />
 * ```
 * @example
 * ```ts
 * normalizeHexColor("#FFF"); // "#ffffffff"
 * normalizeHexColor("transparent"); // "#00000000"
 * ```
 */
export function normalizeHexColor(value: string): string {
  if (value === "transparent") return "#00000000";
  const hex = value.slice(1).toLowerCase();
  if (hex.length === 3) {
    const expanded = [...hex].map((digit) => digit + digit).join("");
    return `#${expanded}ff`;
  }
  return hex.length === 6 ? `#${hex}ff` : `#${hex}`;
}
