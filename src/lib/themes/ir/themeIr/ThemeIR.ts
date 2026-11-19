import type { FormFactor, PaletteSlot } from "../../componentModel";
import type { ColorScheme } from "../../package";
import type { IRBrush } from "./IRBrush";
import type { IRDefaults } from "./IRDefaults";
import type { IRFont } from "./IRFont";
import type { IRImage } from "./IRImage";
import type { IRNode } from "./IRNode";
import type { IRShadowLayer } from "./IRShadowLayer";
import type { IRStyle } from "./IRStyle";
import type { IRValue } from "./IRValue";
import type { THEME_IR_VERSION } from "./themeIrVersion";

/**
 * The compiled form of a validated theme package. Every reference resolves,
 * every value is in range, and palettes hold only explicitly set slots as
 * `#rrggbbaa` literals.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0">
 *   <Palettes>...</Palettes>
 *   <Defaults text="@text/body" />
 * </Theme>
 * ```
 * @example
 * ```ts
 * const { ir } = compileTheme({ manifest, theme, layouts });
 * const background = ir?.palettes.dark?.background;
 * ```
 */
export interface ThemeIR {
  /** Version of the IR shape. */
  readonly irVersion: typeof THEME_IR_VERSION;
  /** The manifest spec the theme was compiled against. */
  readonly spec: string;
  /** The manifest id. */
  readonly themeId: string;
  /** The manifest version. */
  readonly themeVersion: string;
  /** The manifest name. */
  readonly name: string;
  /** The schemes the manifest lists. */
  readonly colorSchemes: ColorScheme[];
  /** Whether the user's accent replaces the theme's accent. */
  readonly honorsUserAccent: boolean;
  /** The form factors the manifest lists. */
  readonly formFactors: FormFactor[];
  /** Explicitly set slots per scheme, as `#rrggbbaa` literals. */
  readonly palettes: Partial<
    Record<ColorScheme, Partial<Record<PaletteSlot, string>>>
  >;
  /** Font families keyed by id. */
  readonly fonts: Record<string, IRFont>;
  /** Text styles keyed by id, with `basedOn` flattened. */
  readonly textStyles: Record<string, Record<string, IRValue>>;
  /** Image assets keyed by id. */
  readonly images: Record<string, IRImage>;
  /** Brushes keyed by id. */
  readonly brushes: Record<string, IRBrush>;
  /** Shadows keyed by id, layer 0 first. */
  readonly shadows: Record<string, IRShadowLayer[]>;
  /** Button styles keyed by id. */
  readonly buttonStyles: Record<string, IRStyle>;
  /** Slider styles keyed by id. */
  readonly sliderStyles: Record<string, IRStyle>;
  /** Panel styles keyed by id. */
  readonly panelStyles: Record<string, IRStyle>;
  /** The fallback style ids from `<Defaults>`. */
  readonly defaults: IRDefaults;
  /** The layout tree per form factor. */
  readonly layouts: Partial<Record<FormFactor, IRNode>>;
}
