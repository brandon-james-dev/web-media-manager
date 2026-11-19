import { SINGLE_LAYOUT, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * A page with exactly one root element, rendered in the Shell's `PageHost`.
 * `id` is the `wmm.ui.navigate` parameter (`E6020` when a button names a
 * missing id). `role` tells the host which page answers an app navigation
 * intent. `presentation="overlay"` covers the Shell and is only allowed on
 * the `nowPlaying` role, as is `openOnPlay` (`E6103`).
 *
 * @example
 * ```xml
 * <Page id="now-playing" role="nowPlaying" titleKey="playback.nowPlaying"
 *       presentation="overlay" openOnPlay="true">
 *   <NowPlaying />
 * </Page>
 * ```
 * @example
 * ```ts
 * const pageIds = new Set(
 *   pages.map((page) => page.attributes.id)
 * );
 * if (!pageIds.has(button.attributes.commandParameter)) {
 *   issues.push({ code: "E6020", attribute: "commandParameter" });
 * }
 * ```
 *
 * @see [SingleChild](../../render/layout/browser/elements/singleChild.tsx)
 * @see [PageHost](../../render/layout/browser/elements/PageHost.tsx)
 */
export const PAGE_ELEMENT: ElementDef = {
  name: "Page",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    titleKey: { type: ValueType.ResourceKey, required: true },
    role: {
      type: ValueType.Enum,
      values: [
        "library",
        "artists",
        "albums",
        "playlists",
        "nowPlaying",
        "sync",
      ],
    },
    default: { type: ValueType.Boolean },
    presentation: {
      type: ValueType.Enum,
      values: ["page", "overlay"],
      default: "page",
    },
    openOnPlay: { type: ValueType.Boolean },
  },
  children: SINGLE_LAYOUT,
  parents: ["Layout"],
  since: THEME_SPEC_VERSION,
};
