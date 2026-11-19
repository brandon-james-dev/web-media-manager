import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { FORM_FACTOR_VALUES } from "../formFactorValues";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * The root of every layout file. `spec` must match the manifest (`E3010`)
 * and `formFactor` must match the file name (`E6001`). Holds one `Shell`
 * and any number of `Page` elements.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="tablet">
 *   <Shell>
 *     <PageHost />
 *   </Shell>
 *   <Page id="library" role="library" titleKey="navigation.library" default="true">
 *     <TrackList />
 *   </Page>
 * </Layout>
 * ```
 * @example
 * ```ts
 * const formFactor = root.attributes.formFactor;
 * if (`layouts/${formFactor}.xml` !== layoutPath) {
 *   issues.push({ code: "E6001", attribute: "formFactor" });
 * }
 * ```
 *
 * @see [ThemedLayout](../../render/layout/browser/ThemedLayout.tsx)
 */
export const LAYOUT_ELEMENT: ElementDef = {
  name: "Layout",
  category: ElementCategory.Root,
  attributes: {
    spec: { type: ValueType.String, required: true },
    formFactor: {
      type: ValueType.Enum,
      values: FORM_FACTOR_VALUES,
      required: true,
    },
  },
  children: { min: 1, max: null, allowed: ["Shell", "Page"] },
  since: THEME_SPEC_VERSION,
};
