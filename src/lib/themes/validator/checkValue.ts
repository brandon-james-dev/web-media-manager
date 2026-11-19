import { ReferenceKind, ValueType } from "../componentModel";
import type { AttributeDef } from "../componentModel";
import {
  AUTHOR_ID,
  AUTHOR_ID_MAX_LENGTH,
  COMMAND_ID,
  DECIMAL,
  HEX_COLOR,
  INTEGER,
  MAX_GRID_TRACKS,
  MAX_STAR_SHARE,
  NON_NEGATIVE_INTEGER,
  REFERENCE,
  REFERENCE_ID,
  RESOURCE_KEY,
  STAR_TRACK,
} from "./constants";

/**
 * A stage 4 problem with one attribute value. The caller adds the file,
 * position and path to make a `ThemeIssue`.
 *
 * @example
 * ```xml
 * <Stack orientation="sideways" />
 * ```
 * @example
 * ```ts
 * const problem: ValueProblem = {
 *   code: "E4005",
 *   message: '"sideways" is not one of: horizontal, vertical.',
 * };
 * ```
 */
export interface ValueProblem {
  readonly code: string;
  readonly message: string;
}

/**
 * Checks a raw attribute value against its {@link AttributeDef}: reserved
 * `{` syntax (`E4020`), length (`E4007`), the value type grammar (`E4004`),
 * enum keywords (`E4005`), numeric ranges (`E4006`) and accepted reference
 * kinds (`E4010`). Whether a reference, resource key or command exists is
 * checked in stage 6.
 *
 * @example
 * ```xml
 * <Grid columns="240 1*" rows="1*" />
 * ```
 * @example
 * ```ts
 * const problem = checkValue("240 1*", { type: ValueType.GridTracks });
 * if (problem !== undefined) report(problem.code, problem.message, node);
 * ```
 */
export function checkValue(
  raw: string,
  def: AttributeDef
): ValueProblem | undefined {
  if (raw.startsWith("{")) {
    return problem("E4020", 'Values starting with "{" are reserved.');
  }
  if (def.maxLength !== undefined && [...raw].length > def.maxLength) {
    return problem(
      "E4007",
      `"${raw}" is longer than ${def.maxLength} characters.`
    );
  }
  switch (def.type) {
    case ValueType.Boolean:
      return raw === "true" || raw === "false"
        ? undefined
        : malformed(raw, "true or false");
    case ValueType.Integer:
      return INTEGER.test(raw)
        ? checkRange(Number(raw), def)
        : malformed(raw, "a whole number");
    case ValueType.Number:
      return DECIMAL.test(raw)
        ? checkRange(Number(raw), def)
        : malformed(raw, "a decimal number");
    case ValueType.Length:
      return checkLength(raw, def);
    case ValueType.LengthOrAuto:
      return raw === "auto" ? undefined : checkLength(raw, def);
    case ValueType.Thickness:
      return checkLengths(raw, [1, 2, 4], "1, 2 or 4 lengths");
    case ValueType.CornerRadius:
      return checkLengths(raw, [1, 4], "1 or 4 lengths");
    case ValueType.Color:
      return checkColor(raw, [ReferenceKind.Color, ReferenceKind.Slot]);
    case ValueType.Brush:
      return checkColor(raw, [
        ReferenceKind.Color,
        ReferenceKind.Slot,
        ReferenceKind.Brush,
      ]);
    case ValueType.Enum:
      return checkKeyword(raw, def.values ?? []);
    case ValueType.EnumList:
      return checkKeywordList(raw, def.values ?? []);
    case ValueType.ResourceKey:
      return RESOURCE_KEY.test(raw)
        ? undefined
        : malformed(raw, "a resource key such as playback.next");
    case ValueType.Reference:
      return checkReference(raw, def.refKinds ?? []);
    case ValueType.Id:
      return AUTHOR_ID.test(raw) && raw.length <= AUTHOR_ID_MAX_LENGTH
        ? undefined
        : malformed(raw, "a kebab-case id of at most 48 characters");
    case ValueType.Command:
      return COMMAND_ID.test(raw)
        ? undefined
        : malformed(raw, "a command id such as wmm.playback.next");
    case ValueType.String:
      return undefined;
    case ValueType.GridTracks:
      return checkGridTracks(raw);
  }
}

/** Builds a {@link ValueProblem}. */
function problem(code: string, message: string): ValueProblem {
  return { code, message };
}

/** Reports a value that does not match its type grammar (`E4004`). */
function malformed(raw: string, expected: string): ValueProblem {
  return problem("E4004", `"${raw}" is not ${expected}.`);
}

/** Checks a number against the attribute's `min` and `max` (`E4006`). */
function checkRange(
  value: number,
  def: AttributeDef | undefined
): ValueProblem | undefined {
  if (def?.min !== undefined && value < def.min) {
    return problem("E4006", `${value} is below the minimum of ${def.min}.`);
  }
  if (def?.max !== undefined && value > def.max) {
    return problem("E4006", `${value} is above the maximum of ${def.max}.`);
  }
  return undefined;
}

/** Checks a pixel length or `@length/` reference. */
function checkLength(
  raw: string,
  def: AttributeDef | undefined
): ValueProblem | undefined {
  if (raw.startsWith("@")) return checkReference(raw, [ReferenceKind.Length]);
  return NON_NEGATIVE_INTEGER.test(raw)
    ? checkRange(Number(raw), def)
    : malformed(raw, "a whole number of pixels or a @length/ reference");
}

/** Checks a space-separated list of lengths with an allowed count. */
function checkLengths(
  raw: string,
  counts: readonly number[],
  expected: string
): ValueProblem | undefined {
  const tokens = raw.split(" ");
  if (!counts.includes(tokens.length)) return malformed(raw, expected);
  for (const token of tokens) {
    const found = checkLength(token, undefined);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Checks a literal color or a reference of an accepted kind. */
function checkColor(
  raw: string,
  kinds: readonly ReferenceKind[]
): ValueProblem | undefined {
  if (raw === "transparent" || HEX_COLOR.test(raw)) return undefined;
  if (raw.startsWith("@")) return checkReference(raw, kinds);
  return malformed(raw, "#RGB, #RRGGBB, #RRGGBBAA, transparent or a reference");
}

/** Checks one keyword against a closed list (`E4005`). */
function checkKeyword(
  raw: string,
  values: readonly string[]
): ValueProblem | undefined {
  return values.includes(raw)
    ? undefined
    : problem("E4005", `"${raw}" is not one of: ${values.join(", ")}.`);
}

/** Checks space-separated keywords, each from a closed list, once each. */
function checkKeywordList(
  raw: string,
  values: readonly string[]
): ValueProblem | undefined {
  const seen = new Set<string>();
  for (const token of raw.split(" ")) {
    if (token === "") return malformed(raw, "keywords separated by spaces");
    if (seen.has(token)) {
      return problem("E4004", `"${token}" is listed more than once.`);
    }
    seen.add(token);
    const found = checkKeyword(token, values);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Checks `@kind/id` syntax and that the kind is accepted (`E4010`). */
function checkReference(
  raw: string,
  kinds: readonly ReferenceKind[]
): ValueProblem | undefined {
  const match = REFERENCE.exec(raw);
  const id = match?.[2] ?? "";
  if (
    match === null ||
    !REFERENCE_ID.test(id) ||
    id.length > AUTHOR_ID_MAX_LENGTH
  ) {
    return malformed(raw, "an @kind/id reference");
  }
  if (!(kinds as readonly string[]).includes(match[1])) {
    const accepted = kinds.map((kind) => `@${kind}/`).join(", ");
    return problem(
      "E4010",
      `@${match[1]}/ references are not allowed here; use ${accepted}.`
    );
  }
  return undefined;
}

/** Checks 1–12 grid tracks: lengths, `auto`, or `N*` with N 1–100. */
function checkGridTracks(raw: string): ValueProblem | undefined {
  const tokens = raw.split(" ");
  if (tokens.length > MAX_GRID_TRACKS) {
    return malformed(raw, `at most ${MAX_GRID_TRACKS} tracks`);
  }
  for (const token of tokens) {
    if (token === "auto") continue;
    const star = STAR_TRACK.exec(token);
    const found = star
      ? checkRange(Number(star[1]), {
          type: ValueType.Integer,
          min: 1,
          max: MAX_STAR_SHARE,
        })
      : checkLength(token, undefined);
    if (found !== undefined) return found;
  }
  return undefined;
}
