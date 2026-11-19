import { Fragment, useMemo, useState } from "react";
import { cn } from "cn";
import { AlbumArtImage } from "@/components/album-art-image";
import { useSidebarPlaylists } from "@/components/library-sidebar/useSidebarPlaylists";
import { SongContextMenu } from "@/components/song-context-menu";
import { useSongs } from "@/hooks";
import { useTranslation } from "@/i18n";
import { ThumbnailSize } from "@/lib";
import { attrBool, attrList, attrString } from "@/lib/themes/render";
import type { ElementProps } from "@/lib/themes/render/browser";
import type { Playlist } from "@/models";
import { useThemeTextClass } from "../../shared/themeText";
import { WidgetFrame } from "../../shared/WidgetFrame";
import { songsForSelection } from "../shared/filterSongs";
import { buildEntries, viewLabelKey } from "../shared/libraryEntries";
import { useLibrarySelection } from "../shared/librarySelection";
import type { LibrarySelection } from "../shared/librarySelection";
import { LibraryTree } from "./LibraryTree";
import {
  PlaylistContextMenu,
  PlaylistRenameDialog,
} from "../shared/PlaylistActions";

/**
 * The library's artists, albums, genres, playlists and songs as a browsable
 * list, grid or vertical tree. Picking one sets the page's selection, which
 * the page's `TrackList` and `CollectionSummary` follow.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="artists albums genres songs" initialView="artists"
 *                 display="list" artwork="true" itemText="@text/body" />
 * <LibraryBrowser views="playlists artists albums songs" display="tree" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={libraryBrowser} />
 * ```
 */
export function ThemeLibraryBrowser({ node, style }: ElementProps) {
  const { t } = useTranslation();
  const { songs } = useSongs();
  const playlists = useSidebarPlaylists();
  const { state, select } = useLibrarySelection();

  const itemClass = useThemeTextClass(node, "itemText");
  const headerClass = useThemeTextClass(node, "headerText");

  const views = attrList(node, "views") ?? [
    "artists",
    "albums",
    "genres",
    "songs",
  ];
  const initialView = attrString(node, "initialView");
  const [view, setView] = useState<string>(() =>
    initialView !== undefined && views.includes(initialView)
      ? initialView
      : (views[0] ?? "songs")
  );

  const display = attrString(node, "display") ?? "list";
  const grid = display === "grid";
  const tree = display === "tree";
  const showArtwork = attrBool(node, "artwork") ?? false;
  const [renaming, setRenaming] = useState<Playlist | undefined>(undefined);

  const entries = useMemo(
    () => buildEntries(view, songs, playlists, t),
    [view, songs, playlists, t]
  );

  if (tree) {
    return (
      <WidgetFrame node={node} style={style}>
        <LibraryTree
          views={views}
          songs={songs}
          playlists={playlists}
          initialView={initialView}
          t={t}
          itemClass={itemClass}
          headerClass={headerClass}
        />
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame node={node} style={style}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {views.map((name) => (
            <button
              key={name}
              type="button"
              className={cn(
                headerClass,
                "rounded-md px-2 py-1 text-left",
                name === view
                  ? "bg-accent/15 text-foreground"
                  : "text-muted-foreground hover:bg-accent/10"
              )}
              aria-pressed={name === view}
              onClick={() => setView(name)}
            >
              {t(viewLabelKey(name))}
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <span className="flex min-h-0 min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
            {t("library.noResults")}
          </span>
        ) : (
          <div
            className={cn(
              "min-h-0 min-w-0 flex-1 overflow-y-auto",
              grid
                ? "grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] content-start gap-2"
                : "flex flex-col gap-0.5"
            )}
          >
            {entries.map((entry) => {
              const selection = entry.selection;
              const playlist =
                selection.kind === "playlist"
                  ? playlists.find((candidate) => candidate.id === selection.id)
                  : undefined;

              const row = (
                <button
                  type="button"
                  className={cn(
                    "min-w-0 cursor-default select-none rounded-md text-left transition-colors",
                    grid
                      ? "flex flex-col gap-1 p-1"
                      : "flex items-center gap-2 px-1.5 py-1",
                    isSelected(state.selection, entry.selection)
                      ? "bg-accent/15 text-foreground"
                      : "text-muted-foreground hover:bg-accent/10"
                  )}
                  aria-pressed={isSelected(state.selection, entry.selection)}
                  onClick={() => select(entry.selection)}
                >
                  {showArtwork ? (
                    <AlbumArtImage
                      songId={entry.pictureSongId}
                      thumbSize={ThumbnailSize.thumb64}
                      className={cn(
                        "shrink-0 rounded bg-muted",
                        grid ? "aspect-square w-full" : "size-8"
                      )}
                      fallback={
                        <span
                          className={cn(
                            "block shrink-0 rounded bg-muted",
                            grid ? "aspect-square w-full" : "size-8"
                          )}
                        />
                      }
                    />
                  ) : null}
                  <span className="flex min-w-0 flex-col">
                    <span className={cn(itemClass, "truncate")}>
                      {entry.label}
                    </span>
                    <span className="truncate text-xs text-muted-foreground tabular-nums">
                      {t("library.songCount", [entry.count])}
                    </span>
                  </span>
                </button>
              );

              if (playlist !== undefined) {
                return (
                  <PlaylistContextMenu
                    key={entry.key}
                    playlist={playlist}
                    onRename={() => setRenaming(playlist)}
                  >
                    {row}
                  </PlaylistContextMenu>
                );
              }

              if (selection.kind === "playlist") {
                return <Fragment key={entry.key}>{row}</Fragment>;
              }

              return (
                <SongContextMenu
                  key={entry.key}
                  songs={songsForSelection(songs, selection)}
                >
                  {row}
                </SongContextMenu>
              );
            })}
          </div>
        )}
      </div>
      <PlaylistRenameDialog
        playlist={renaming}
        onClose={() => setRenaming(undefined)}
      />
    </WidgetFrame>
  );
}

/** Whether an entry is the page's current selection. */
function isSelected(
  current: LibrarySelection,
  entry: LibrarySelection
): boolean {
  if (current.kind !== entry.kind) return false;
  if (current.kind === "all" || entry.kind === "all") return true;
  if (current.kind === "view" && entry.kind === "view") {
    return current.view === entry.view;
  }
  if (current.kind === "view" || entry.kind === "view") return false;
  if (current.kind === "playlist" && entry.kind === "playlist") {
    return current.id === entry.id;
  }
  if (current.kind === "playlist" || entry.kind === "playlist") return false;
  return current.value === entry.value;
}
