import { FormFactor } from "./formFactor";

/**
 * Every {@link FormFactor} value, in breakpoint order from widest to
 * narrowest, then TV. These are the allowed values of the `formFactor`
 * attribute on `<Layout>`, and each one names its layout file
 * (`layouts/<value>.xml`, `E6001` on a mismatch).
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="tablet">
 * ```
 * @example
 * ```ts
 * const layoutFiles = FORM_FACTOR_VALUES.map((value) => `layouts/${value}.xml`);
 * ```
 */
export const FORM_FACTOR_VALUES = [
  FormFactor.Desktop,
  FormFactor.Tablet,
  FormFactor.Mobile,
  FormFactor.Tv,
] as const;
