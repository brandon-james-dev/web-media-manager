/**
 * The device class a layout file targets. Each value maps to one file in
 * `layouts/`, and the root `formFactor` attribute must match the file name
 * (`E6001`). Every layout file is optional; a form factor without one shows
 * the built-in UI with the theme's tokens.
 *
 * @example
 * ```xml
 * <!-- layouts/tablet.xml -->
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="tablet" />
 * ```
 * @example
 * ```ts
 * const file = `layouts/${FormFactor.Desktop}.xml`;
 * ```
 */
export const FormFactor = {
  /**
   * Viewports 1024 px and wider with a fine pointer.
   *
   * @example
   * ```xml
   * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
   * ```
   */
  Desktop: "desktop",
  /**
   * Viewports 640–1023 px, or a coarse pointer up to 1366 px.
   *
   * @example
   * ```xml
   * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="tablet" />
   * ```
   */
  Tablet: "tablet",
  /**
   * Viewports narrower than 640 px, including phones in landscape.
   *
   * @example
   * ```xml
   * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="mobile" />
   * ```
   */
  Mobile: "mobile",
  /**
   * Ten-foot, remote-driven screens. Detected before the others (`?tv=1`, a
   * TV user agent, or no pointer at 960 px and wider). `<SearchBox>` is not
   * allowed here (`E6095`).
   *
   * @example
   * ```xml
   * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="tv" />
   * ```
   */
  Tv: "tv",
} as const;

/**
 * One of the {@link FormFactor} values.
 *
 * @example
 * ```ts
 * function layoutPath(formFactor: FormFactor): string {
 *   return `layouts/${formFactor}.xml`;
 * }
 * ```
 */
export type FormFactor = (typeof FormFactor)[keyof typeof FormFactor];
