import { PALETTE_SLOTS } from "../componentModel";
import type { PaletteSlot } from "../componentModel";
import { normalizeHexColor } from "./themeIr";

/** Splits a `#rrggbbaa` color into red, green, blue and alpha bytes. */
function channelsOf(color: string): number[] {
  const hex = normalizeHexColor(color).slice(1);
  return [0, 2, 4, 6].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16)
  );
}

/** Builds a lowercase `#rrggbbaa` color from four channel values. */
function hexOf(channels: readonly number[]): string {
  const digits = channels.map((channel) =>
    Math.round(channel).toString(16).padStart(2, "0")
  );
  return `#${digits.join("")}`;
}

/** Interpolates every channel, alpha included, from one color to another. */
function mix(from: string, to: string, amount: number): string {
  const start = channelsOf(from);
  const end = channelsOf(to);
  return hexOf(
    start.map((value, index) => value + (end[index] - value) * amount)
  );
}

/** Scales a color's alpha channel by a factor. */
function withAlpha(color: string, factor: number): string {
  const channels = channelsOf(color);
  channels[3] *= factor;
  return hexOf(channels);
}

/** Relative luminance of a color, per WCAG 2.1, ignoring alpha. */
function luminance(color: string): number {
  const [red, green, blue] = channelsOf(color)
    .slice(0, 3)
    .map((channel) => channel / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio between two colors, from 1 to 21. */
function contrastRatio(left: string, right: string): number {
  const a = luminance(left);
  const b = luminance(right);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Picks black or white, whichever contrasts more with the base color. */
function contrasting(base: string): string {
  return contrastRatio(base, "#ffffffff") > contrastRatio(base, "#000000ff")
    ? "#ffffffff"
    : "#000000ff";
}

/**
 * Fills in every palette slot from the frozen derivation table in
 * `02-theme-xml.md`. Explicitly set slots always win, and a user accent
 * replaces `accent` and re-derives the slots that follow from it while
 * keeping explicitly set ones. Output is lowercase `#rrggbbaa`.
 *
 * @example
 * ```xml
 * <Palette scheme="dark">
 *   <Set slot="background" value="#0b1a3a" />
 *   <Set slot="foreground" value="#e8eefc" />
 *   <Set slot="accent" value="#3d7bea" />
 *   <Set slot="border" value="#2a4a8a" />
 * </Palette>
 * ```
 * @example
 * ```ts
 * const palette = derivePalette({
 *   background: "#0b1a3a",
 *   foreground: "#e8eefc",
 *   accent: "#3d7bea",
 *   border: "#2a4a8a",
 * });
 * palette.card; // "#142242ff"
 * ```
 */
export function derivePalette(
  set: Partial<Record<PaletteSlot, string>>,
  userAccent?: string
): Record<PaletteSlot, string> {
  const explicit = new Map<PaletteSlot, string>();
  for (const slot of PALETTE_SLOTS) {
    const value = set[slot];
    if (value !== undefined) explicit.set(slot, normalizeHexColor(value));
  }

  const background = explicit.get("background") ?? "#00000000";
  const foreground = explicit.get("foreground") ?? "#ffffffff";
  const border = explicit.get("border") ?? "#00000000";
  const accent =
    userAccent === undefined
      ? (explicit.get("accent") ?? "#00000000")
      : normalizeHexColor(userAccent);

  const derived: Record<PaletteSlot, string> = {
    background,
    foreground,
    accent,
    border,
    card: mix(background, foreground, 0.04),
    popover: mix(background, foreground, 0.04),
    cardForeground: foreground,
    popoverForeground: foreground,
    primary: accent,
    primaryForeground: contrasting(accent),
    accentForeground: contrasting(accent),
    secondary: mix(background, foreground, 0.08),
    muted: mix(background, foreground, 0.08),
    secondaryForeground: foreground,
    mutedForeground: withAlpha(foreground, 0.65),
    destructive: "#dc2626ff",
    input: border,
    ring: accent,
    selection: withAlpha(accent, 0.25),
    selectionForeground: foreground,
    progressTrack: mix(background, foreground, 0.08),
    progressFill: accent,
  };

  for (const [slot, value] of explicit) derived[slot] = value;
  derived.accent = accent;

  derived.primary = explicit.get("primary") ?? accent;
  derived.primaryForeground =
    explicit.get("primaryForeground") ?? contrasting(derived.primary);
  derived.accentForeground =
    explicit.get("accentForeground") ?? contrasting(accent);
  derived.progressTrack = explicit.get("progressTrack") ?? derived.muted;
  return derived;
}
