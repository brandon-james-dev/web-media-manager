import type { UseTranslationResult } from "@/i18n";
import type { Song } from "@/models";
import { buildEntries } from "./libraryEntries";
import type { LibrarySelection } from "./librarySelection";

/**
 * What a tree node is: a top-level group, a view inside the library group,
 * one of a view's values, or an action row that runs something instead of
 * selecting.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="playlists artists albums songs" display="tree" />
 * ```
 * @example
 * ```ts
 * const kind: LibraryTreeNodeKind = "value";
 * ```
 */
export type LibraryTreeNodeKind = "group" | "view" | "value" | "action";

/**
 * One row of the browser's tree, with its children already built.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="playlists artists albums songs" display="tree" />
 * ```
 * @example
 * ```ts
 * const node: LibraryTreeNode = {
 *   id: "view:songs",
 *   label: "Songs",
 *   depth: 1,
 *   kind: "view",
 *   selection: { kind: "all" },
 *   children: [],
 * };
 * ```
 */
export interface LibraryTreeNode {
  /** Stable id, used for expansion state and the roving tabindex. */
  readonly id: string;
  /** The text the row shows. */
  readonly label: string;
  /** Nesting level, 0 for the two top-level nodes. */
  readonly depth: number;
  /** What the node is. */
  readonly kind: LibraryTreeNodeKind;
  /** The selection picking the node sets, when it sets one. */
  readonly selection?: LibrarySelection;
  /** The node's children, empty for a leaf. */
  readonly children: LibraryTreeNode[];
}

/**
 * What {@link buildLibraryTree} needs: the views in order, the songs and
 * playlists to group, the view to open first, and the translator.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="playlists artists albums songs" initialView="artists" display="tree" />
 * ```
 * @example
 * ```ts
 * const tree = buildLibraryTree({
 *   views: ["playlists", "artists", "songs"],
 *   songs,
 *   playlists,
 *   initialView: "artists",
 *   t,
 * });
 * ```
 */
export interface BuildLibraryTreeInput {
  /** The views the browser lists, in order. */
  readonly views: readonly string[];
  /** The songs the value nodes are grouped from. */
  readonly songs: readonly Song[];
  /** The playlists the playlists node lists. */
  readonly playlists: readonly {
    id: string;
    name: string;
    songs: { songId: string }[];
  }[];
  /** The view whose node opens first, when the browser names one. */
  readonly initialView?: string;
  /** The translator the labels come from. */
  readonly t: UseTranslationResult["t"];
}

/**
 * Builds the browser's tree: a playlists node when the views include
 * playlists, then a library node whose children are the other views in order.
 * The top-level nodes come back sorted by label, so the order the views are
 * named in never decides which group sits first.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="playlists artists albums songs genres" display="tree" />
 * ```
 * @example
 * ```ts
 * const tree = buildLibraryTree(input);
 * tree.map((node) => node.id); // ["group:library", "group:playlists"]
 * ```
 */
export function buildLibraryTree({
  views,
  songs,
  playlists,
  t,
}: BuildLibraryTreeInput): LibraryTreeNode[] {
  const tree: LibraryTreeNode[] = [];

  if (views.includes("playlists")) {
    tree.push({
      id: "group:playlists",
      label: t("navigation.playlists"),
      depth: 0,
      kind: "group",
      selection: { kind: "view", view: "playlists" },
      children: [
        {
          id: "action:createPlaylist",
          label: t("playlist.new"),
          depth: 1,
          kind: "action",
          children: [],
        },
        ...playlists.map((playlist) => ({
          id: `playlist:${playlist.id}`,
          label: playlist.name,
          depth: 1,
          kind: "value" as const,
          selection: { kind: "playlist" as const, id: playlist.id },
          children: [],
        })),
      ],
    });
  }

  const libraryChildren: LibraryTreeNode[] = [];

  for (const view of views) {
    if (view === "playlists") continue;
    if (view === "songs") {
      libraryChildren.push({
        id: "view:songs",
        label: t("library.songs"),
        depth: 1,
        kind: "view",
        selection: { kind: "all" },
        children: [],
      });
      continue;
    }
    if (view !== "artists" && view !== "albums" && view !== "genres") continue;
    libraryChildren.push({
      id: `view:${view}`,
      label: t(viewLabel(view)),
      depth: 1,
      kind: "view",
      selection: { kind: "view", view },
      children: buildEntries(view, songs, playlists, t).map((entry) => ({
        id: `value:${view}:${entry.key}`,
        label: entry.label,
        depth: 2,
        kind: "value",
        selection: entry.selection,
        children: [],
      })),
    });
  }

  tree.push({
    id: "group:library",
    label: t("navigation.library"),
    depth: 0,
    kind: "group",
    selection: { kind: "all" },
    children: libraryChildren,
  });

  return [...tree].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * The ids open before the user touches anything: the top-level groups. Views
 * start closed so none of them hides the others.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="playlists artists albums songs" display="tree" />
 * ```
 * @example
 * ```ts
 * [...defaultExpandedIds(tree)]; // ["group:library", "group:playlists"]
 * ```
 */
export function defaultExpandedIds(
  tree: readonly LibraryTreeNode[]
): Set<string> {
  const expanded = new Set<string>();
  for (const node of tree) {
    if (node.kind === "group") expanded.add(node.id);
  }
  return expanded;
}

/**
 * The rows a reader sees, in order: every node whose ancestors are all open.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="playlists artists songs" display="tree" />
 * ```
 * @example
 * ```ts
 * flattenVisible(tree, new Set(["group:library"])).map((n) => n.id);
 * ```
 */
export function flattenVisible(
  tree: readonly LibraryTreeNode[],
  expanded: ReadonlySet<string>
): LibraryTreeNode[] {
  const visible: LibraryTreeNode[] = [];
  const walk = (nodes: readonly LibraryTreeNode[]): void => {
    for (const node of nodes) {
      visible.push(node);
      if (node.children.length > 0 && expanded.has(node.id)) {
        walk(node.children);
      }
    }
  };
  walk(tree);
  return visible;
}

/** The resource key of one library view's label. */
function viewLabel(
  view: string
): "library.artists" | "library.albums" | "library.genres" {
  switch (view) {
    case "artists":
      return "library.artists";
    case "albums":
      return "library.albums";
    default:
      return "library.genres";
  }
}
