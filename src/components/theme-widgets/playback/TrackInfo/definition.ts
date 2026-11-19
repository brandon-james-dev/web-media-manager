import {
  COMMON_ATTRIBUTES,
  ElementCategory,
  NO_CHILDREN,
  ReferenceKind,
  THEME_SPEC_VERSION,
  ValueType,
  WIDGET_ATTRIBUTES,
} from "@/lib/themes/widgetKit";
import type { ElementDef } from "@/lib/themes/widgetKit";

/**
 * The song fields a `TrackInfo` can show. These are the allowed values of its
 * `fields` and `trailing` attributes (ordered, space-separated subsets; a
 * field listed twice is `E4004`, an unknown field is `E4005`). The time
 * fields `elapsed`, `total`, `remaining` and `elapsedAndTotal` read the
 * playback clock and show `--:--` while the duration is unknown.
 *
 * @example
 * ```xml
 * <TrackInfo fields="title artist" trailing="elapsedAndTotal" />
 * ```
 * @example
 * ```ts
 * const values: readonly string[] = TRACK_INFO_FIELDS;
 * const timed = values.includes("elapsedAndTotal");
 * ```
 */
export const TRACK_INFO_FIELDS = [
  "title",
  "explicit",
  "favorite",
  "artist",
  "album",
  "albumArtist",
  "genre",
  "year",
  "track",
  "disc",
  "bitrate",
  "elapsed",
  "total",
  "remaining",
  "elapsedAndTotal",
] as const;

/**
 * Title and details of the current track, or `playback.nothingPlaying`
 * when idle. `fields` is an ordered subset of {@link TRACK_INFO_FIELDS};
 * `favorite` is a button that toggles the current song's favorite.
 * `trailing` takes the same values and draws them right after the title,
 * on the title line when `stacked`. A centered `hAlign` centers stacked
 * text. The time
 * fields show `--:--` while the duration is unknown, and
 * `elapsedAndTotal` reads `01:07 / 08:57`. Minimum 80×16, unlimited per
 * page.
 *
 * @example
 * ```xml
 * <TrackInfo fields="title explicit artist favorite" />
 * <TrackInfo fields="title" trailing="elapsedAndTotal" arrangement="inline" />
 * ```
 * @example
 * ```ts
 * const { values } = LAYOUT_ELEMENTS.TrackInfo.attributes.fields;
 * const fields = (node.attributes.fields ?? "").split(/\s+/);
 * for (const field of fields.filter(Boolean)) {
 *   if (!values?.includes(field)) reportSpecMismatch(node);
 * }
 * ```
 *
 * @see [ThemeTrackInfo](./TrackInfo.tsx)
 */
export const TRACK_INFO_ELEMENT: ElementDef = {
  name: "TrackInfo",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    fields: {
      type: ValueType.EnumList,
      values: TRACK_INFO_FIELDS,
    },
    trailing: {
      type: ValueType.EnumList,
      values: TRACK_INFO_FIELDS,
    },
    arrangement: {
      type: ValueType.Enum,
      values: ["stacked", "inline"],
    },
    titleText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    detailText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  children: NO_CHILDREN,
  minSize: { width: 80, height: 16 },
  perPage: null,
  since: THEME_SPEC_VERSION,
};
