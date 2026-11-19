import type { FormFactor } from "../../../componentModel";
import type { ThemeIR } from "../../../ir";
import type { ThemeImageResolver } from "../types";

/**
 * What every declaration serializer needs: the theme, the image resolver and
 * the form factor whose layout supplies the inline overrides.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const ctx: StyleContext = { ir, images, formFactor: "desktop" };
 * ```
 */
export interface StyleContext {
  readonly ir: ThemeIR;
  readonly images: ThemeImageResolver;
  readonly formFactor: FormFactor;
}
