/**
 * Version of the compiled theme IR. The host recompiles a cached IR when
 * this number or the validator version changes.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const stale = cached.irVersion !== THEME_IR_VERSION;
 * ```
 */
export const THEME_IR_VERSION = 1;
