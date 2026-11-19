import { useEffect, useMemo, useState } from "react";
import { cn } from "cn";
import { useSidebarPlaylists } from "@/components/library-sidebar/useSidebarPlaylists";
import { TrackItem } from "@/components/track-item";
import { TvTrackList } from "@/components/tv";
import { ItemGroup } from "@/components/ui/item";
import { moveSongInPlaylist, removeSongsFromPlaylist } from "@/core/playlists";
import { wmmBus } from "@/events";
import { usePlayback, useSongs } from "@/hooks";
import { useTranslation } from "@/i18n";
import { LAYOUT_ELEMENTS } from "@/lib/themes/componentModel";
import { compareDiscThenTrack, selectors } from "@/lib/persistence";
import type { SortableColumn } from "@/lib/persistence";
import type { IRNode } from "@/lib/themes/ir";
import {
  useThemeLayoutSnapshot,
  useThemeRender,
} from "@/lib/themes/render/browser";
import type { Song } from "@/models";
import { attrBool, attrList, attrString } from "@/lib/themes/render";
import type { ElementProps } from "@/lib/themes/render/browser";
import { useThemeTextClass } from "../../shared/themeText";
import { WidgetFrame } from "../../shared/WidgetFrame";
import { filterLibrarySongs } from "../shared/filterSongs";
import { buildEntries } from "../shared/libraryEntries";
import { LibraryEntryGrid } from "./LibraryEntryGrid";
import { useLibrarySelection } from "../shared/librarySelection";
import { cycleTrackSort } from "./playlistOrder";
import { usePlaylistReadOnly } from "../shared/PlaylistActions";
import { readStoredSort, writeStoredSort } from "./storedTrackSort";
import { ThemeTrackTable } from "./ThemeTrackTable";
import type { TrackTableSort } from "./ThemeTrackTable";
import {
  flattenGroups,
  groupByAlbum,
  parseColumns,
  resolveAlbumsLayout,
  TRACK_COLUMN_DEFS,
} from "./trackColumns";
import type { TrackColumnId } from "./trackColumns";

/**
 * The songs of the page's selection: a table, a compact list or a television
 * list. Rows select on click and play on double click, and the visible order
 * becomes the playback collection.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title artist album duration"
 *            sortBy="artist" density="compact" playingText="@text/accent" />
 * <TrackList variant="list" fields="artwork artist duration" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={trackList} />
 * ```
 */
export function ThemeTrackList({ node, style }: ElementProps) {
  const { t } = useTranslation();
  const { songs } = useSongs();
  const { nowPlaying } = usePlayback();
  const { state, select, setSelectedSongIds } = useLibrarySelection();
  const playlists = useSidebarPlaylists();
  const { ir } = useThemeRender();
  const { currentPage } = useThemeLayoutSnapshot();
  const sortKey = `wmm.themeTrackList.${ir.themeId ?? "theme"}.${currentPage}.sort`;

  const rowClass = useThemeTextClass(node, "rowText");
  const headerClass = useThemeTextClass(node, "headerText");
  const playingClass = useThemeTextClass(node, "playingText");

  const variant = attrString(node, "variant") ?? "table";
  const density = attrString(node, "density") ?? "comfortable";
  const alternateRows = attrBool(node, "alternateRows") ?? false;
  const editMode = isEditMode(node);

  const [sort, setSort] = useState<TrackTableSort | undefined>(() => {
    const stored = readStoredSort(sortKey);
    if (stored === null) return undefined;
    if (stored !== undefined) return stored;
    return {
      column: (attrString(node, "sortBy") ??
        (variant === "albums" ? "album" : "title")) as TrackColumnId,
      desc: attrString(node, "sortDirection") === "descending",
    };
  });

  const selection = state.selection;
  const playlist =
    selection.kind === "playlist"
      ? playlists.find((candidate) => candidate.id === selection.id)
      : undefined;
  const readOnly = usePlaylistReadOnly();
  const canEditPlaylist = playlist !== undefined && !readOnly(playlist);
  const playlistSongIds = useMemo(
    () =>
      selection.kind === "playlist"
        ? playlists
            .find((entry) => entry.id === selection.id)
            ?.songs.map((entry) => entry.songId)
        : undefined,
    [selection, playlists]
  );

  const visible = useMemo(
    () => filterLibrarySongs(songs, state, playlistSongIds),
    [songs, state, playlistSongIds]
  );

  const defaultColumns =
    LAYOUT_ELEMENTS.TrackList.attributes.columns.default ?? "";
  const columnsAttribute =
    attrList(node, "columns")?.join(" ") ?? defaultColumns;
  const parsedColumns = useMemo(
    () => parseColumns(columnsAttribute, "table"),
    [columnsAttribute]
  );
  const layout = useMemo(
    () =>
      resolveAlbumsLayout(
        variant === "albums" ? "albums" : "table",
        sort?.column ?? (variant === "albums" ? "album" : "title"),
        parsedColumns
      ),
    [variant, sort, parsedColumns]
  );
  const grouped = layout.grouped;

  const groups = useMemo(
    () =>
      grouped
        ? groupByAlbum(visible, undefined, false, {
            unknownArtist: t("common.unknownArtist"),
            unknownAlbum: t("library.unknownAlbum"),
          })
        : [],
    [grouped, visible, t]
  );

  const albumGroups = useMemo(
    () => (sort?.desc ? [...groups].reverse() : groups),
    [groups, sort]
  );

  const ordered = useMemo(() => {
    if (grouped) {
      const byId = new Map(visible.map((song) => [song.id, song]));
      const flattened: Song[] = [];
      for (const id of flattenGroups(albumGroups)) {
        const song = byId.get(id);
        if (song !== undefined) flattened.push(song);
      }
      return flattened;
    }
    if (sort === undefined) return visible;
    const selector = selectorFor(sort.column);
    const sorted = [...visible].sort((a, b) => {
      const result = compareValues(selector(a), selector(b));
      if (result !== 0) return sort.desc ? -result : result;
      if (sort.column !== "album") return 0;
      return compareDiscThenTrack(a, b);
    });
    return sorted;
  }, [grouped, visible, albumGroups, sort]);

  const viewEntries = useMemo(() => {
    if (selection.kind !== "view") return [];
    const unselected = filterLibrarySongs(songs, {
      ...state,
      selection: { kind: "all" },
    });
    return buildEntries(selection.view, unselected, playlists, t);
  }, [selection, songs, state, playlists, t]);

  const playlistSelectionId =
    selection.kind === "playlist" ? selection.id : undefined;

  useEffect(() => {
    if (playlistSelectionId === undefined) return;
    setSort(undefined);
  }, [playlistSelectionId]);

  useEffect(() => {
    if (selection.kind === "view") return;
    wmmBus.invoke("wmm.playback.setCollectionSource", {
      songIds: ordered.map((song) => song.id),
    });
  }, [ordered, selection.kind]);

  function handleSelect(songIds: string[]): void {
    setSelectedSongIds(songIds);
    wmmBus.publish("wmm.ui.selectionChanged", { songIds });
  }

  function handleSort(column: TrackColumnId): void {
    const next = cycleTrackSort(sort, column, selection.kind === "playlist");
    setSort(next);
    if (selection.kind !== "playlist") writeStoredSort(sortKey, next);
  }

  function handleReorder(from: number, to: number): void {
    if (playlist === undefined) return;
    const fromSong = ordered[from];
    const toSong = ordered[to];
    if (fromSong === undefined || toSong === undefined) return;
    void moveSongInPlaylist(playlist.id, fromSong.id, toSong.id);
  }

  function handleRemoveSelected(): void {
    if (playlist === undefined || state.selectedSongIds.length === 0) return;
    void removeSongsFromPlaylist(playlist.id, state.selectedSongIds);
  }

  function handleDoubleClick(song: Song): void {
    if (editMode) {
      wmmBus.invoke("wmm.library.song.edit", { songId: song.id });
      return;
    }
    wmmBus.invoke("wmm.playback.playCollection", {
      songIds: ordered.map((entry) => entry.id),
      startSongId: song.id,
    });
  }

  function toggleSelection(song: Song): void {
    handleSelect(
      state.selectedSongIds.includes(song.id)
        ? state.selectedSongIds.filter((id) => id !== song.id)
        : [...state.selectedSongIds, song.id]
    );
  }

  const fields = attrList(node, "fields") ?? ["artwork", "artist", "duration"];

  return (
    <WidgetFrame node={node} style={style}>
      {selection.kind === "view" && variant !== "tv" ? (
        <LibraryEntryGrid
          view={selection.view}
          entries={viewEntries}
          songs={songs}
          playlists={playlists}
          rowClass={rowClass}
          headerClass={headerClass}
          onOpen={(entry) => select(entry.selection)}
        />
      ) : variant === "table" || variant === "albums" ? (
        <ThemeTrackTable
          songs={ordered}
          variant={grouped ? "albums" : "table"}
          columns={layout.columns}
          showHeader={attrBool(node, "showHeader") ?? true}
          resizeColumns={attrBool(node, "resizeColumns") ?? true}
          reorderColumns={attrBool(node, "reorderColumns") ?? true}
          alternateRows={alternateRows}
          density={density}
          rowClass={rowClass}
          headerClass={headerClass}
          playingClass={playingClass}
          selectedSongIds={state.selectedSongIds}
          nowPlayingId={nowPlaying?.id}
          sort={sort}
          onSort={handleSort}
          onSelect={handleSelect}
          onActivate={handleDoubleClick}
          onFilter={select}
          storageKey={
            variant === "albums"
              ? grouped
                ? "albums"
                : "albums-flat"
              : variant
          }
          groups={grouped ? albumGroups : undefined}
          playlistId={playlist?.id}
          reorderable={
            canEditPlaylist && sort === undefined && variant === "table"
          }
          onReorder={handleReorder}
          onRemoveSelected={canEditPlaylist ? handleRemoveSelected : undefined}
        />
      ) : ordered.length === 0 ? (
        <span className="flex min-h-0 min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
          {t("library.noSongsFound")}
        </span>
      ) : variant === "tv" ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <TvTrackList
            songs={ordered}
            nowPlayingSongId={nowPlaying?.id}
            onPlay={handleDoubleClick}
          />
        </div>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 cursor-default select-none flex-col overflow-y-auto">
          <ItemGroup className="gap-0! has-data-[size=sm]:gap-0! has-data-[size=xs]:gap-0!">
            {ordered.map((song, index) => (
              <TrackItem
                key={song.id}
                song={song}
                index={index}
                size={density === "compact" ? "sm" : "default"}
                showArtwork={fields.includes("artwork")}
                showMeta={fields.includes("artist") || fields.includes("album")}
                isPlaying={nowPlaying?.id === song.id}
                onClick={() => toggleSelection(song)}
                onDoubleClick={() => handleDoubleClick(song)}
                className={cn(
                  rowClass,
                  density === "compact" ? "min-h-7" : "min-h-11",
                  alternateRows && "odd:bg-muted/40",
                  state.selectedSongIds.includes(song.id) && "bg-primary/15",
                  nowPlaying?.id === song.id && playingClass
                )}
              />
            ))}
          </ItemGroup>
        </div>
      )}
    </WidgetFrame>
  );
}

/** The selector a column sorts by, from the shared map or the column itself. */
function selectorFor(column: TrackColumnId): (song: Song) => unknown {
  if (column in selectors) return selectors[column as SortableColumn];
  return TRACK_COLUMN_DEFS[column].value;
}

/** Whether the node renders in edit mode, read the way the renderer reads it. */
function isEditMode(node: IRNode): boolean {
  return attrString(node, "libraryMode") === "edit";
}

/** Orders two column values, with a missing value last. */
function compareValues(left: unknown, right: unknown): number {
  if (left === right) return 0;
  if (left === undefined || left === null) return 1;
  if (right === undefined || right === null) return -1;
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }
  return String(left).localeCompare(String(right));
}
