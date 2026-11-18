import { WMM_THEME_COMMANDS } from "@/events/taxonomy";
import type { WmmCommandName } from "@/events/taxonomy";

/**
 * The payload a theme button sends with its command: the parsed parameter
 * under the field name the command declares.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.seekBy" commandParameter="-10" labelKey="playback.rewind" />
 * ```
 * @example
 * ```ts
 * const payload: ThemeCommandPayload = { deltaSeconds: -10 };
 * ```
 */
export type ThemeCommandPayload = Record<string, string | number>;

/**
 * The outcome of {@link buildCommandPayload}. A rejected parameter never
 * reaches the bus, so a malformed button warns instead of invoking a command
 * with the wrong shape.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.navigate" commandParameter="library" labelKey="navigation.library" />
 * ```
 * @example
 * ```ts
 * const result = buildCommandPayload("wmm.ui.navigate", "library");
 * result.ok ? result.payload : result.reason;
 * ```
 */
export type CommandPayloadResult =
  | {
      /** The parameter parsed into a payload. */
      readonly ok: true;
      /** The payload, or `undefined` for a command without a parameter. */
      readonly payload: ThemeCommandPayload | undefined;
    }
  | {
      /** The parameter was missing or outside its domain. */
      readonly ok: false;
      /** Why the payload was rejected. */
      readonly reason: string;
    };

/**
 * Builds the payload a theme button sends for its command, using the
 * parameter domain the theme command table declares. An unknown command, a
 * missing parameter or a value outside its domain is rejected.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.seekBy" commandParameter="10" labelKey="playback.forward" />
 * ```
 * @example
 * ```ts
 * buildCommandPayload("wmm.playback.seekBy", "10");
 * // { ok: true, payload: { deltaSeconds: 10 } }
 * buildCommandPayload("wmm.playback.seekBy", "0");
 * // { ok: false, reason: "..." }
 * ```
 */
export function buildCommandPayload(
  command: string,
  commandParameter?: string
): CommandPayloadResult {
  if (!Object.hasOwn(WMM_THEME_COMMANDS, command)) {
    return {
      ok: false,
      reason: `"${command}" is not a theme-invokable command.`,
    };
  }

  const spec = WMM_THEME_COMMANDS[command as WmmCommandName];
  const parameter = spec?.parameter;
  if (parameter === undefined) return { ok: true, payload: undefined };

  if (parameter.kind === "integer") {
    const value = parseInteger(
      commandParameter,
      parameter.min,
      parameter.max,
      parameter.nonZero
    );
    if (value === undefined) {
      return {
        ok: false,
        reason: `"${command}" needs a whole number from ${parameter.min} to ${parameter.max}.`,
      };
    }
    return { ok: true, payload: { [parameter.field]: value } };
  }

  if (commandParameter === undefined || commandParameter.length === 0) {
    return {
      ok: false,
      reason: `"${command}" needs a ${parameter.kind === "pageId" ? "page" : "panel"} id.`,
    };
  }
  return { ok: true, payload: { [parameter.field]: commandParameter } };
}

/** Parses a whole number inside the command's domain. */
function parseInteger(
  value: string | undefined,
  min: number,
  max: number,
  nonZero: boolean
): number | undefined {
  if (value === undefined || !/^-?\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  if (parsed < min || parsed > max) return undefined;
  if (nonZero && parsed === 0) return undefined;
  return parsed;
}
