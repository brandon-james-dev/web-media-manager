import type { FormFactor } from "../../../componentModel";
import { PALETTE_VARIABLES } from "../../../runtime";
import { rule } from "./cssRules";

/**
 * The class the host uses when a theme sets no default button style.
 *
 * @example
 * ```xml
 * <Defaults panel="@panel/content" />
 * ```
 * @example
 * ```ts
 * BUILTIN_BUTTON_CLASS; // "wmm-builtin-button"
 * ```
 */
export const BUILTIN_BUTTON_CLASS = "wmm-builtin-button";

/**
 * The class the host uses when a theme sets no default panel style.
 *
 * @example
 * ```xml
 * <Defaults button="@button/standard" />
 * ```
 * @example
 * ```ts
 * BUILTIN_PANEL_CLASS; // "wmm-builtin-panel"
 * ```
 */
export const BUILTIN_PANEL_CLASS = "wmm-builtin-panel";

/**
 * The class the host uses when a theme sets no default text style.
 *
 * @example
 * ```xml
 * <Defaults button="@button/standard" panel="@panel/content" />
 * ```
 * @example
 * ```ts
 * BUILTIN_TEXT_CLASS; // "wmm-builtin-text"
 * ```
 */
export const BUILTIN_TEXT_CLASS = "wmm-builtin-text";

/** The host built-in fallback classes, derived from the palette variables. */
export function builtinRules(formFactor: FormFactor): string[] {
  const rules = [
    rule(`.${BUILTIN_BUTTON_CLASS}`, {
      display: "inline-flex",
      "align-items": "center",
      "justify-content": "center",
      gap: "6px",
      "padding-block-start": "6px",
      "padding-inline-end": "10px",
      "padding-block-end": "6px",
      "padding-inline-start": "10px",
      "border-radius": "var(--radius)",
      color: "var(--foreground)",
      "background-color": "transparent",
    }),
    rule(`.${BUILTIN_PANEL_CLASS}`, {
      color: "var(--foreground)",
      "background-color": "transparent",
    }),
    rule(`.${BUILTIN_TEXT_CLASS}`, { color: "inherit" }),
  ];
  if (formFactor === "desktop") {
    rules.push(
      rule(`.${BUILTIN_BUTTON_CLASS}:where(:hover:not(:disabled))`, {
        "background-color": "var(--accent)",
        color: "var(--accent-foreground)",
      })
    );
  }
  rules.push(
    rule(`.${BUILTIN_BUTTON_CLASS}:where(:focus-visible)`, {
      outline: `2px solid var(${PALETTE_VARIABLES.ring[0]})`,
      "outline-offset": "2px",
    })
  );
  rules.push(
    rule(`.${BUILTIN_BUTTON_CLASS}:where(:disabled,[aria-disabled="true"])`, {
      opacity: "0.5",
    })
  );
  return rules;
}
