/**
 * Form-factor resolution: the pure rule table that maps a viewport and its
 * pointer and television signals to one layout form factor.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * import { resolveFormFactor } from "@/lib/themes/render/formFactor";
 * resolveFormFactor({ ...inputs, pin: "tv" }); // "tv"
 * ```
 *
 * @module
 */
export { resolveFormFactor } from "./resolveFormFactor";
export type { FormFactorInputs } from "./resolveFormFactor";
