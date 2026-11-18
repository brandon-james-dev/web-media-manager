import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "cn";
import {
  ChevronRight,
  Disc,
  Library,
  ListMusic,
  ListPlus,
  Music,
  Tags,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SongContextMenu } from "@/components/song-context-menu";
import type { UseTranslationResult } from "@/i18n";
import {
  useThemeLayoutSnapshot,
  useThemeRender,
} from "@/lib/themes/render/layout/browser/ThemeRenderContext";
import type { Playlist, Song } from "@/models";
import { songsForSelection } from "./filterSongs";
import { useLibrarySelection } from "./librarySelection";
import type { LibrarySelection } from "./librarySelection";
import {
  buildLibraryTree,
  defaultExpandedIds,
  flattenVisible,
} from "./libraryTreeModel";
import type { LibraryTreeNode } from "./libraryTreeModel";
import {
  PlaylistContextMenu,
  PlaylistDeleteDialog,
  PlaylistNameEditor,
  useNewPlaylistDialog,
  usePlaylistReadOnly,
} from "./PlaylistActions";

/**
 * What the tree needs: the views in order, the songs and playlists to group,
 * the view to open first, and the translator.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="playlists artists albums songs" display="tree" />
 * ```
 * @example
 * ```ts
 * const props: LibraryTreeProps = { views, songs, playlists, initialView: "artists", t };
 * ```
 */
export interface LibraryTreeProps {
  /** The views the browser lists, in order. */
  readonly views: readonly string[];
  /** The songs the value nodes are grouped from. */
  readonly songs: readonly Song[];
  /** The playlists the playlists node lists. */
  readonly playlists: readonly Playlist[];
  /** The view whose node opens first, when the browser names one. */
  readonly initialView?: string;
  /** The translator the labels come from. */
  readonly t: UseTranslationResult["t"];
  /** The class of the row text style. */
  readonly itemClass: string;
  /** The class of the two top-level nodes. */
  readonly headerClass: string;
}

/**
 * The browser as a vertical navigation tree: a playlists node and a library
 * node whose children are the other views, each expandable into its values.
 * Rows are full width, so the highlight keeps one width whatever the label.
 *
 * Clicking a row's label selects: a row that carries its own selection picks
 * it, and a group or a view without one selects every song, so the track list
 * shows the whole library. Clicking Artist, Album, Genre or Playlists shows
 * that view's entries in the track pane, while Library and Songs show every
 * song. Only the chevron toggles expansion, so opening a view never changes
 * what the list shows. One row is highlighted at a time: a value or playlist
 * row while its selection is the page's, and a row whose selection is every
 * song only while it is the row the reader last picked.
 *
 * The first row under Playlists creates a playlist. Playlist rows open a
 * context menu with play, rename and delete, F2 renames the focused row in
 * place and Delete asks before deleting it. Every other value row and the
 * view rows open the song menu for the songs they hold.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="playlists artists albums songs" initialView="artists" display="tree" />
 * ```
 * @example
 * ```tsx
 * <LibraryTree views={views} songs={songs} playlists={playlists} t={t} itemClass={itemClass} headerClass={headerClass} />
 * ```
 */
export function LibraryTree({
  views,
  songs,
  playlists,
  t,
  itemClass,
  headerClass,
}: LibraryTreeProps) {
  const { state, select } = useLibrarySelection();
  const { ir } = useThemeRender();
  const { currentPage } = useThemeLayoutSnapshot();
  const activeKey = `wmm.themeLibraryTree.${ir.themeId ?? "theme"}.${currentPage}.active`;
  const readOnly = usePlaylistReadOnly();
  const { setOpen: setNewPlaylistOpen, dialog: newPlaylistDialog } =
    useNewPlaylistDialog();
  const [renamingId, setRenamingId] = useState<string | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<Playlist | undefined>(
    undefined
  );

  const tree = useMemo(
    () => buildLibraryTree({ views, songs, playlists, t }),
    [views, songs, playlists, t]
  );

  const [expanded, setExpanded] = useState<Set<string>>(() =>
    defaultExpandedIds(tree)
  );
  const [activeId, setActiveId] = useState<string | undefined>(() =>
    initialActiveId(tree, readActive(activeKey))
  );
  const [focusedId, setFocusedId] = useState<string | undefined>(
    () => tree[0]?.id
  );
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const initialActiveRef = useRef(activeId);
  const initialTreeRef = useRef(tree);
  const initialSelectRef = useRef(select);

  useEffect(() => {
    const id = initialActiveRef.current;
    if (id === undefined) return;
    const node = findNode(initialTreeRef.current, id);
    if (node === undefined) return;
    initialSelectRef.current(node.selection ?? { kind: "all" });
  }, []);

  const visible = useMemo(
    () => flattenVisible(tree, expanded),
    [tree, expanded]
  );

  const songsFor = useMemo(() => {
    const cache = new Map<string, Song[]>();
    return (selection: LibrarySelection): Song[] => {
      const key = selectionKey(selection);
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      const next = songsForSelection(songs, selection);
      cache.set(key, next);
      return next;
    };
  }, [songs]);

  function toggle(id: string): void {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function activate(node: LibraryTreeNode): void {
    setFocusedId(node.id);
    if (node.kind === "action") {
      setNewPlaylistOpen(true);
      return;
    }
    setActiveId(node.id);
    writeActive(activeKey, node.id);
    select(node.selection ?? { kind: "all" });
  }

  function focusRow(id: string): void {
    setFocusedId(id);
    rowRefs.current.get(id)?.focus();
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    node: LibraryTreeNode,
    index: number
  ): void {
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const next = visible[index + 1];
        if (next !== undefined) focusRow(next.id);
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        const previous = visible[index - 1];
        if (previous !== undefined) focusRow(previous.id);
        return;
      }
      case "ArrowRight": {
        event.preventDefault();
        if (node.children.length === 0) return;
        if (!expanded.has(node.id)) {
          toggle(node.id);
          return;
        }
        const first = node.children[0];
        if (first !== undefined) focusRow(first.id);
        return;
      }
      case "ArrowLeft": {
        event.preventDefault();
        if (node.children.length > 0 && expanded.has(node.id)) {
          toggle(node.id);
          return;
        }
        const parent = parentOf(tree, node.id);
        if (parent !== undefined) focusRow(parent.id);
        return;
      }
      case "F2": {
        event.preventDefault();
        const playlist = playlistOf(node, playlists);
        if (playlist === undefined || readOnly(playlist)) return;
        setRenamingId(playlist.id);
        return;
      }
      case "Delete": {
        event.preventDefault();
        const playlist = playlistOf(node, playlists);
        if (
          playlist === undefined ||
          readOnly(playlist) ||
          playlist.isFavorites === true
        ) {
          return;
        }
        setPendingDelete(playlist);
        return;
      }
      case "Enter":
      case " ": {
        event.preventDefault();
        activate(node);
        return;
      }
      default:
        return;
    }
  }

  return (
    <div
      role="tree"
      aria-label={t("navigation.library")}
      className="flex min-h-0 min-w-0 flex-1 cursor-default flex-col overflow-x-hidden overflow-y-auto"
    >
      {visible.map((node, index) => {
        const expandable = node.children.length > 0;
        const open = expanded.has(node.id);
        const effective = node.selection ?? { kind: "all" };
        const selected =
          node.kind !== "action" &&
          isSelected(state.selection, effective) &&
          (effective.kind !== "all" || activeId === node.id);
        const Icon = iconFor(node);
        const playlist = playlistOf(node, playlists);
        const renaming = playlist !== undefined && renamingId === playlist.id;

        const row = (
          <div
            ref={(element) => {
              if (element === null) rowRefs.current.delete(node.id);
              else rowRefs.current.set(node.id, element);
            }}
            role="treeitem"
            aria-expanded={expandable ? open : undefined}
            aria-selected={selected}
            tabIndex={node.id === focusedId ? 0 : -1}
            data-depth={node.depth}
            className={cn(
              "flex w-full min-w-0 shrink-0 cursor-default select-none items-center gap-1 rounded-md text-sm outline-none",
              "h-5.5",
              node.kind === "group" ? headerClass : itemClass,
              selected
                ? "bg-accent/15 text-foreground"
                : "text-muted-foreground hover:bg-accent/10",
              "focus-visible:ring-1 focus-visible:ring-ring"
            )}
            style={{ paddingInlineStart: `${node.depth * 12}px` }}
            onClick={() => {
              activate(node);
            }}
            onKeyDown={(event) => handleKeyDown(event, node, index)}
          >
            {expandable ? (
              <span
                role="button"
                tabIndex={-1}
                aria-hidden="true"
                className="flex size-5 shrink-0 cursor-default items-center justify-center rounded hover:bg-accent/20"
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(node.id);
                }}
              >
                <ChevronRight
                  aria-hidden="true"
                  className={cn(
                    "size-4 transition-transform",
                    open && "rotate-90"
                  )}
                />
              </span>
            ) : (
              <span aria-hidden="true" className="size-5 shrink-0" />
            )}
            {Icon === undefined ? (
              <span aria-hidden="true" className="size-4 shrink-0" />
            ) : (
              <Icon aria-hidden="true" className="size-4 shrink-0" />
            )}
            {renaming && playlist !== undefined ? (
              <PlaylistNameEditor
                playlist={playlist}
                className={cn(itemClass, "min-w-0 flex-1")}
                onDone={() => setRenamingId(undefined)}
              />
            ) : (
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  node.kind === "action" && "italic"
                )}
              >
                {node.label}
              </span>
            )}
          </div>
        );

        if (playlist !== undefined) {
          return (
            <PlaylistContextMenu
              key={node.id}
              playlist={playlist}
              afterDelete={{ kind: "view", view: "playlists" }}
              onRename={() => setRenamingId(playlist.id)}
            >
              {row}
            </PlaylistContextMenu>
          );
        }

        if (node.kind === "value" || node.kind === "view") {
          return (
            <SongContextMenu key={node.id} songs={songsFor(effective)}>
              {row}
            </SongContextMenu>
          );
        }

        return <Fragment key={node.id}>{row}</Fragment>;
      })}
      {newPlaylistDialog}
      <PlaylistDeleteDialog
        playlist={pendingDelete}
        afterDelete={{ kind: "view", view: "playlists" }}
        onClose={() => setPendingDelete(undefined)}
      />
    </div>
  );
}

/** The playlist a value node selects, when it selects one. */
function playlistOf(
  node: LibraryTreeNode,
  playlists: readonly Playlist[]
): Playlist | undefined {
  if (node.kind !== "value") return undefined;
  const selection = node.selection;
  if (selection === undefined || selection.kind !== "playlist")
    return undefined;
  return playlists.find((playlist) => playlist.id === selection.id);
}

/** A stable key for one selection, so its songs are computed once a render. */
function selectionKey(selection: LibrarySelection): string {
  switch (selection.kind) {
    case "all":
      return "all";
    case "view":
      return `view:${selection.view}`;
    case "playlist":
      return `playlist:${selection.id}`;
    default:
      return `${selection.kind}:${selection.value}`;
  }
}

/** The icon a node shows, or undefined for a value leaf. */
function iconFor(node: LibraryTreeNode): LucideIcon | undefined {
  if (node.kind === "value") return undefined;
  if (node.id === "action:createPlaylist") return ListPlus;
  if (node.id === "group:playlists") return ListMusic;
  if (node.id === "group:library") return Library;
  switch (node.id) {
    case "view:artists":
      return User;
    case "view:albums":
      return Disc;
    case "view:songs":
      return Music;
    case "view:genres":
      return Tags;
    default:
      return undefined;
  }
}

/** The row highlighted before the reader picks one: the stored row, else the library group. */
function initialActiveId(
  tree: readonly LibraryTreeNode[],
  storedId: string | undefined
): string | undefined {
  if (storedId !== undefined) {
    const stored = findNode(tree, storedId);
    if (stored !== undefined && stored.kind !== "action") return stored.id;
  }
  const library = findNode(tree, "group:library");
  return library === undefined ? undefined : library.id;
}

/** The node with the given id anywhere in the tree. */
function findNode(
  tree: readonly LibraryTreeNode[],
  id: string
): LibraryTreeNode | undefined {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** The parent of a node in the tree, when it has one. */
function parentOf(
  tree: readonly LibraryTreeNode[],
  id: string
): LibraryTreeNode | undefined {
  const walk = (
    nodes: readonly LibraryTreeNode[]
  ): LibraryTreeNode | undefined => {
    for (const node of nodes) {
      if (node.children.some((child) => child.id === id)) return node;
      const found = walk(node.children);
      if (found !== undefined) return found;
    }
    return undefined;
  };
  return walk(tree);
}

/** Whether a node's selection is the page's current selection. */
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

/** The stored active row id under one key, when it is readable. */
function readActive(key: string): string | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(key);
    return raw === null || raw === "" ? undefined : raw;
  } catch {
    return undefined;
  }
}

/** Stores one key's active row id, ignoring a storage that refuses the write. */
function writeActive(key: string, id: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, id);
  } catch {
    return;
  }
}
