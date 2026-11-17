/**
 * Every semantic color slot a palette may set, in spec order. The slots are
 * the app's own color vocabulary: dialogs, menus, Settings, toasts and every
 * widget read them, so a palette alone re-colors the entire app. A palette
 * must set the four required slots (`E6014`); the rest derive defaults that
 * are frozen for the life of major version 1.
 *
 * @example
 * ```xml
 * <Palette scheme="dark">
 *   <Set slot="background" value="@color/navy-900" />
 *   <Set slot="accent" value="#3d8bff" />
 * </Palette>
 * ```
 * @example
 * ```ts
 * const known = PALETTE_SLOTS.includes(set.attributes.slot);
 * if (!known) {
 *   reportUnknownSlot(set);
 * }
 * ```
 */
export const PALETTE_SLOTS = [
  "background",
  "foreground",
  "accent",
  "border",
  "card",
  "popover",
  "cardForeground",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "accentForeground",
  "secondary",
  "muted",
  "secondaryForeground",
  "mutedForeground",
  "destructive",
  "input",
  "ring",
  "selection",
  "selectionForeground",
  "progressTrack",
  "progressFill",
] as const;

/**
 * The slots every palette must set explicitly. A palette missing one of them
 * is an error (`E6014`), because none of them has a derivation rule.
 *
 * @example
 * ```xml
 * <Palette scheme="light">
 *   <Set slot="background" value="#ffffff" />
 *   <Set slot="foreground" value="#111827" />
 *   <Set slot="accent" value="#2563eb" />
 *   <Set slot="border" value="#d1d5db" />
 * </Palette>
 * ```
 * @example
 * ```ts
 * const missing = REQUIRED_PALETTE_SLOTS.filter((slot) => !set.has(slot));
 * if (missing.length > 0) {
 *   report("E6014", palette);
 * }
 * ```
 */
export const REQUIRED_PALETTE_SLOTS = [
  "background",
  "foreground",
  "accent",
  "border",
] as const;

/**
 * One of the {@link PALETTE_SLOTS} names.
 *
 * @example
 * ```ts
 * const slot: PaletteSlot = "mutedForeground";
 * ```
 */
export type PaletteSlot = (typeof PALETTE_SLOTS)[number];
