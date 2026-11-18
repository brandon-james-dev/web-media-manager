import { useMemo } from "react";
import { cn } from "cn";
import { AlbumArtImage } from "@/components/album-art-image";
import { useSidebarPlaylists } from "@/components/library-sidebar/useSidebarPlaylists";
import { useSongs } from "@/hooks";
import { useTranslation } from "@/i18n";
import type { UseTranslationResult, WmmResourceKey } from "@/i18n";
import { ThumbnailSize } from "@/lib";
import { attrList } from "@/lib/themes/render";
import {
  useThemeLayoutSnapshot,
  useThemeRender,
} from "@/lib/themes/render/browser";
import type { ElementProps } from "@/lib/themes/render/browser";
import { useThemeTextClass } from "../shared/themeText";
import { WidgetFrame } from "../shared/WidgetFrame";
import { filterLibrarySongs, summarize } from "./filterSongs";
import { useLibrarySelection } from "./librarySelection";
import type { LibrarySelection } from "./librarySelection";

/**
 * A summary of the page's `TrackList` collection: a mosaic of the first four
 * covers, the collection's title, and its song count with its total length.
 *
 * @example
 * ```xml
 * <CollectionSummary fields="artwork title count duration"
 *                    titleText="@text/tv-title" detailText="@text/tv-detail" />
 * <CollectionSummary fields="title count duration" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={collectionSummary} />
 * ```
 */
export function ThemeCollectionSummary({ node, style }: ElementProps) {
  const { t } = useTranslation();
  const { analysis } = useThemeRender();
  const { currentPage } = useThemeLayoutSnapshot();
  const { songs } = useSongs();
  const playlists = useSidebarPlaylists();
  const { state } = useLibrarySelection();

  const titleClass = useThemeTextClass(node, "titleText");
  const detailClass = useThemeTextClass(node, "detailText");

  const fields = attrList(node, "fields") ?? [
    "artwork",
    "title",
    "count",
    "duration",
  ];

  const selection = state.selection;
  const playlistSongIds = useMemo(
    () =>
      selection.kind === "playlist"
        ? playlists
            .find((playlist) => playlist.id === selection.id)
            ?.songs.map((entry) => entry.songId)
        : undefined,
    [selection, playlists]
  );

  const visible = useMemo(
    () => filterLibrarySongs(songs, state, playlistSongIds),
    [songs, state, playlistSongIds]
  );
  const totals = useMemo(() => summarize(visible), [visible]);
  const covers = useMemo(
    () => visible.filter((song) => song.pictures?.length).slice(0, 4),
    [visible]
  );

  const pageTitleKey = analysis.pages.find(
    (page) => page.id === currentPage
  )?.titleKey;
  const title = summaryTitle(selection, playlists, pageTitleKey, t);
  const minutes = Math.round(totals.totalSeconds / 60);

  return (
    <WidgetFrame node={node} style={style}>
      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2">
        {fields.includes("artwork") ? (
          <div className="grid size-10 shrink-0 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded bg-muted">
            {covers.length === 0 ? (
              <span className="col-span-2 row-span-2 block size-full bg-muted" />
            ) : (
              covers.map((song) => (
                <AlbumArtImage
                  key={song.id}
                  songId={song.id}
                  thumbSize={ThumbnailSize.thumb64}
                  className="size-full"
                  fallback={<span className="block size-full bg-muted" />}
                />
              ))
            )}
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          {fields.includes("title") ? (
            <span className={cn(titleClass, "truncate")}>{title}</span>
          ) : null}
          <span className={cn(detailClass, "truncate tabular-nums")}>
            {fields.includes("count")
              ? t("library.songCount", [totals.count])
              : null}
            {fields.includes("count") && fields.includes("duration")
              ? " · "
              : null}
            {fields.includes("duration")
              ? t("library.totalMinutes", [minutes])
              : null}
          </span>
        </div>
      </div>
    </WidgetFrame>
  );
}

/** The collection's title: the selection, the playlist, or the page's own. */
function summaryTitle(
  selection: LibrarySelection,
  playlists: readonly { id: string; name: string }[],
  pageTitleKey: string | undefined,
  t: UseTranslationResult["t"]
): string {
  switch (selection.kind) {
    case "artist":
    case "album":
    case "genre":
    case "year":
      return selection.value;
    case "playlist":
      return (
        playlists.find((playlist) => playlist.id === selection.id)?.name ??
        t("navigation.playlists")
      );
    default:
      return pageTitleKey === undefined
        ? t("library.songs")
        : t(pageTitleKey as WmmResourceKey);
  }
}
