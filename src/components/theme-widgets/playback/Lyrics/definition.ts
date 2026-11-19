import {
  ReferenceKind,
  ValueType,
  defineWidget,
} from "@/core/themes/widgetKit";

/**
 * The current song's lyrics, or `playback.noLyrics`. Minimum 160×80, one
 * per page.
 *
 * @example
 * ```xml
 * <Tab id="lyrics" titleKey="playback.lyrics" icon="@icon/lyrics">
 *   <Lyrics align="center" text="@text/body" />
 * </Tab>
 * ```
 * @example
 * ```ts
 * const align = node.attributes.align ?? "start";
 * const centered = align === "center";
 * ```
 *
 * @see [ThemeLyrics](./Lyrics.tsx)
 */
export const LYRICS_ELEMENT = defineWidget({
  name: "Lyrics",
  attributes: {
    align: { type: ValueType.Enum, values: ["start", "center"] },
    text: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  minSize: { width: 160, height: 80 },
  perPage: 1,
});
