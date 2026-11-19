import { ElementCategory, getElementDef } from "../../componentModel";
import type { ElementCategory as ElementCategoryValue } from "../../componentModel/elementCategory";
import type { ReferenceKind } from "../../componentModel/referenceKind";
import type { IRNode, IRValue } from "../../ir";

/**
 * Reads one attribute of a layout node, falling back to the default the
 * component model declares for it. An attribute the author left unset is
 * absent from the compiled IR, so the default is the only source for it.
 *
 * @example
 * ```xml
 * <Stack orientation="horizontal" />
 * ```
 * @example
 * ```ts
 * readAttr(node, "orientation"); // "horizontal"
 * readAttr(node, "gap"); // undefined
 * ```
 */
export function readAttr(node: IRNode, name: string): IRValue | undefined {
  const value = node.attributes[name];
  if (value !== undefined) return value;
  return getElementDef(node.element)?.attributes[name]?.default;
}

/**
 * Reads an attribute as a string. A numeric or boolean value yields
 * `undefined`, so a caller that expects a keyword never sees a coerced one.
 *
 * @example
 * ```xml
 * <Page id="library" role="library" />
 * ```
 * @example
 * ```ts
 * attrString(page, "role"); // "library"
 * ```
 */
export function attrString(node: IRNode, name: string): string | undefined {
  const value = readAttr(node, name);
  return typeof value === "string" ? value : undefined;
}

/**
 * Reads a space-separated keyword list attribute. The compiled IR stores an
 * authored list as an array, while a declared default is still a string, so
 * both are accepted. Any other value yields `undefined`.
 *
 * @example
 * ```xml
 * <TrackInfo fields="title artist" trailing="elapsedAndTotal" />
 * ```
 * @example
 * ```ts
 * attrList(trackInfo, "fields"); // ["title", "artist"]
 * attrList(trackInfo, "arrangement"); // ["inline"]
 * ```
 */
export function attrList(node: IRNode, name: string): string[] | undefined {
  const value = readAttr(node, name);
  if (typeof value === "string") return value.split(/\s+/).filter(Boolean);
  if (!Array.isArray(value)) return undefined;
  const items: unknown[] = value;
  return items.every((item): item is string => typeof item === "string")
    ? [...items]
    : undefined;
}

/**
 * Reads an attribute as a number. A declared default written as a numeric
 * string, such as `"0"`, is parsed; a keyword default such as `"auto"` is
 * not.
 *
 * @example
 * ```xml
 * <Grid row="1" column="0" />
 * ```
 * @example
 * ```ts
 * attrNumber(child, "row"); // 1
 * attrNumber(child, "rowSpan"); // 1
 * ```
 */
export function attrNumber(node: IRNode, name: string): number | undefined {
  const value = readAttr(node, name);
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Reads an attribute as a boolean. The compiler stores `true` and `false` as
 * booleans, while a declared default stays the string the model wrote.
 *
 * @example
 * ```xml
 * <Panel collapsible="true" />
 * ```
 * @example
 * ```ts
 * attrBool(panel, "collapsible"); // true
 * attrBool(panel, "visible"); // undefined
 * ```
 */
export function attrBool(node: IRNode, name: string): boolean | undefined {
  const value = readAttr(node, name);
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/**
 * Reads a reference attribute and returns its id when the reference is of
 * the expected kind. A reference of another kind, or a literal value, yields
 * `undefined`.
 *
 * @example
 * ```xml
 * <Panel style="@panel/chrome" />
 * ```
 * @example
 * ```ts
 * attrRef(panel, "style", "panel"); // "chrome"
 * attrRef(panel, "style", "button"); // undefined
 * ```
 */
export function attrRef(
  node: IRNode,
  name: string,
  kind: ReferenceKind
): string | undefined {
  const value = node.attributes[name];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  if (!("ref" in value) || value.ref !== kind) return undefined;
  return typeof value.id === "string" ? value.id : undefined;
}

/**
 * Whether the node is a host-rendered widget, which the layout renderer
 * replaces with a placeholder until the widget itself ships.
 *
 * @example
 * ```xml
 * <TrackList variant="table" />
 * ```
 * @example
 * ```ts
 * isWidget(trackList); // true
 * isWidget(grid); // false
 * ```
 */
export function isWidget(node: IRNode): boolean {
  return getElementDef(node.element)?.category === ElementCategory.Widget;
}

/**
 * The category the component model declares for the node's element, or
 * `undefined` for an element the model does not know.
 *
 * @example
 * ```xml
 * <Panel style="@panel/chrome" />
 * ```
 * @example
 * ```ts
 * elementCategory(panel); // "primitive"
 * ```
 */
export function elementCategory(
  node: IRNode
): ElementCategoryValue | undefined {
  return getElementDef(node.element)?.category;
}
