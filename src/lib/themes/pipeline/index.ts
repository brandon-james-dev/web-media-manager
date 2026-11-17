/**
 * The full theme package pipeline: archive, manifest, XML, grammar,
 * semantics and compilation in one call.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const { manifest, files, ir, issues } = validateThemePackage(zipBytes);
 * ```
 */
export { validateThemePackage } from "./validateThemePackage";
export type {
  ThemeValidationResult,
  ValidateThemeOptions,
} from "./validateThemePackage";
