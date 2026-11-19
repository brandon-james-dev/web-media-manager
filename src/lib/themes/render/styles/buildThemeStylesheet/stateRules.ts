import type { IRStyle, IRStyleState } from "../../../ir";

/**
 * The state stages in ascending precedence. Rules are emitted stage by stage
 * so equal-specificity source order encodes the precedence the spec defines.
 *
 * @example
 * ```xml
 * <State name="pressed" background="@brush/chrome-gloss-down" />
 * ```
 * @example
 * ```ts
 * STATE_STAGES.at(-1); // "disabled"
 * ```
 */
export const STATE_STAGES = [
  "focused",
  "hover",
  "selected",
  "active",
  "activeValue",
  "pressed",
  "disabled",
] as const;

/**
 * One state stage of {@link STATE_STAGES}.
 *
 * @example
 * ```xml
 * <State name="active" value="one" />
 * ```
 * @example
 * ```ts
 * const stage: StateStage = "activeValue";
 * ```
 */
export type StateStage = (typeof STATE_STAGES)[number];

/**
 * The shape a valued `active` state must match before its value reaches a
 * selector.
 *
 * @example
 * ```xml
 * <State name="active" value="one" />
 * ```
 * @example
 * ```ts
 * ACTIVE_VALUE.test("one"); // true
 * ```
 */
export const ACTIVE_VALUE = /^[a-z][a-zA-Z0-9-]*$/;

/** The state of one stage, if the style declares it. */
export function stateOf(
  style: IRStyle,
  stage: StateStage
): IRStyleState | undefined {
  return style.states.find((state) => stageOf(state) === stage);
}

/** The stage a state belongs to. */
export function stageOf(state: IRStyleState): StateStage | undefined {
  switch (state.name) {
    case "focused":
      return "focused";
    case "hover":
      return "hover";
    case "selected":
      return "selected";
    case "active":
      return state.value === undefined ? "active" : "activeValue";
    case "pressed":
      return "pressed";
    case "disabled":
      return "disabled";
    default:
      return undefined;
  }
}

/** The selector of one state, with `:where()` keeping specificity equal. */
export function stateSelector(
  className: string,
  stage: StateStage,
  state: IRStyleState
): string | undefined {
  switch (stage) {
    case "focused":
      return `.${className}:where(:focus-visible)`;
    case "hover":
      return `.${className}:where(:hover:not(:disabled))`;
    case "selected":
      return `.${className}:where([data-selected])`;
    case "active":
      return `.${className}:where([data-active])`;
    case "activeValue": {
      const value = state.value ?? "";
      if (!ACTIVE_VALUE.test(value)) return undefined;
      return `.${className}:where([data-active-value="${value}"])`;
    }
    case "pressed":
      return `.${className}:where(:active:not(:disabled))`;
    case "disabled":
      return `.${className}:where(:disabled,[aria-disabled="true"])`;
  }
}

/** Whether a style's focused state already draws a visible focus indicator. */
export function hasFocusRing(style: IRStyle): boolean {
  const focused = style.states.find((state) => state.name === "focused");
  if (focused === undefined) return false;
  return (
    focused.properties.border !== undefined ||
    focused.properties.borderWidth !== undefined ||
    focused.properties.shadow !== undefined
  );
}
