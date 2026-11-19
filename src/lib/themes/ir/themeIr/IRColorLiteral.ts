/**
 * A color resolved to a literal `#rrggbbaa` value. `transparent` becomes
 * `#00000000` and `#rgb` is expanded, so every literal has eight digits.
 *
 * @example
 * ```xml
 * <Button foreground="#ffffff80" />
 * ```
 * @example
 * ```ts
 * const white: IRColorLiteral = { kind: "literal", value: "#ffffffff" };
 * ```
 */
export interface IRColorLiteral {
  /** Discriminator for a resolved literal. */
  readonly kind: "literal";
  /** Lowercase `#rrggbbaa` value. */
  readonly value: string;
}
