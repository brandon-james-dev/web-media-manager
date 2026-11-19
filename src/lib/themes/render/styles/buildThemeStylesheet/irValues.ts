import type { IRBrushValue, IRColor, IRRef, IRValue } from "../../../ir";

/** Whether a compiled value is a reference of the given kind. */
export function referenceOf(
  value: IRValue | undefined,
  ref: string
): IRRef | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  if (!("ref" in value) || value.ref !== ref) return undefined;
  return typeof value.id === "string" ? value : undefined;
}

/** A compiled brush value. */
export function brushValue(
  value: IRValue | undefined
): IRBrushValue | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  if (!("kind" in value)) return undefined;
  return value.kind === "color" || value.kind === "brush" ? value : undefined;
}

/** A compiled color value. */
export function colorValue(value: IRValue | undefined): IRColor | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  if (!("kind" in value)) return undefined;
  return value.kind === "literal" || value.kind === "slot" ? value : undefined;
}

/** A compiled thickness or corner radius value. */
export function thicknessValue(
  value: IRValue | undefined
): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const numbers = value.filter(
    (entry): entry is number => typeof entry === "number"
  );
  return numbers.length === value.length ? numbers : undefined;
}

/** A compiled number value. */
export function numberValue(value: IRValue | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

/** A compiled boolean value. */
export function booleanValue(value: IRValue | undefined): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/** A compiled enum value mapped through a host whitelist. */
export function enumValue(
  value: IRValue | undefined,
  table: Record<string, string>
): string | undefined {
  return typeof value === "string" ? table[value] : undefined;
}
