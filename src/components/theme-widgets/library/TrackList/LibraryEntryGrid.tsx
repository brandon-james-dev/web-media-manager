import { Fragment, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "cn";
import { ListMusic, Tags } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AlbumArtImage } from "@/components/album-art-image";
import { SongContextMenu } from "@/components/song-context-menu";
import { useTranslation } from "@/i18n";
import { ThumbnailSize } from "@/lib";
import type { Playlist, Song } from "@/models";
import { songsForSelection } from "../shared/filterSongs";
import { viewLabelKey } from "../shared/libraryEntries";
import type { BrowserEntry } from "../shared/libraryEntries";
import {
  PlaylistContextMenu,
  PlaylistRenameDialog,
} from "../shared/PlaylistActions";

/**
 * What the entry grid needs: the view it lists, that view's entries, the songs
 * and playlists behind them, the text styles and the callback a tile opens
 * with.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title artist" />
 * ```
 * @example
 * ```ts
 * const props: LibraryEntryGridProps = {
 *   view: "artists",
 *   entries,
 *   songs,
 *   playlists,
 *   rowClass: "",
 *   headerClass: "",
 *   onOpen: (entry) => select(entry.selection),
 * };
 * ```
 */
export interface LibraryEntryGridProps {
  /** The view whose entries the grid lists. */
  readonly view: string;
  /** The entries to show, already built for the view. */
  readonly entries: readonly BrowserEntry[];
  /** The songs the entries are grouped from. */
  readonly songs: readonly Song[];
  /** The playlists the playlists view lists. */
  readonly playlists: readonly Playlist[];
  /** The class of the tile label text style. */
  readonly rowClass: string;
  /** The class of the tile count text style. */
  readonly headerClass: string;
  /** Called with the entry a double click or Enter opens. */
  readonly onOpen: (entry: BrowserEntry) => void;
}

/**
 * A view's entries as a wrapping grid of cover tiles, each with its label and
 * its song count. A click highlights a tile, and a double click or Enter opens
 * it, which sets the page's selection and shows that entry's songs.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="artists albums genres" display="tree" />
 * ```
 * @example
 * ```tsx
 * <LibraryEntryGrid view="artists" entries={entries} rowClass={rowClass} headerClass={headerClass} onOpen={open} />
 * ```
 */
export function LibraryEntryGrid({
  view,
  entries,
  songs,
  playlists,
  rowClass,
  headerClass,
  onOpen,
}: LibraryEntryGridProps) {
  const { t } = useTranslation();
  const [activeKey, setActiveKey] = useState<string | undefined>(undefined);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [renaming, setRenaming] = useState<Playlist | undefined>(undefined);
  const tileRefs = useRef(new Map<string, HTMLDivElement>());

  function focusTile(index: number): void {
    const entry = entries[index];
    if (entry === undefined) return;
    setFocusedIndex(index);
    tileRefs.current.get(entry.key)?.focus();
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    entry: BrowserEntry,
    index: number
  ): void {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown": {
        event.preventDefault();
        focusTile(Math.min(entries.length - 1, index + 1));
        return;
      }
      case "ArrowLeft":
      case "ArrowUp": {
        event.preventDefault();
        focusTile(Math.max(0, index - 1));
        return;
      }
      case "Home": {
        event.preventDefault();
        focusTile(0);
        return;
      }
      case "End": {
        event.preventDefault();
        focusTile(entries.length - 1);
        return;
      }
      case "Enter": {
        event.preventDefault();
        onOpen(entry);
        return;
      }
      default:
        return;
    }
  }

  if (entries.length === 0) {
    return (
      <span className="flex min-h-0 min-w-0 flex-1 cursor-default select-none items-center justify-center text-sm text-muted-foreground">
        {t("library.noSongsFound")}
      </span>
    );
  }

  return (
    <>
      <div
        role="list"
        aria-label={t(viewLabelKey(view))}
        className="grid min-h-0 min-w-0 flex-1 cursor-default select-none grid-cols-[repeat(auto-fill,minmax(132px,1fr))] content-start gap-3 overflow-y-auto p-3"
      >
        {entries.map((entry, index) => {
          const Icon = iconFor(view);
          const active = activeKey === entry.key;
          const selection = entry.selection;
          const playlist =
            selection.kind === "playlist"
              ? playlists.find((candidate) => candidate.id === selection.id)
              : undefined;

          const tile = (
            <div
              ref={(element) => {
                if (element === null) tileRefs.current.delete(entry.key);
                else tileRefs.current.set(entry.key, element);
              }}
              role="listitem"
              tabIndex={index === focusedIndex ? 0 : -1}
              className={cn(
                "flex min-w-0 cursor-default select-none flex-col gap-1.5 rounded-md p-1 outline-none transition-colors",
                active
                  ? "bg-accent/15 text-foreground"
                  : "text-muted-foreground hover:bg-accent/10",
                "focus-visible:ring-1 focus-visible:ring-ring"
              )}
              onClick={() => {
                setFocusedIndex(index);
                setActiveKey(entry.key);
              }}
              onDoubleClick={() => onOpen(entry)}
              onKeyDown={(event) => handleKeyDown(event, entry, index)}
            >
              <div className="aspect-square w-full overflow-hidden rounded">
                {entry.pictureSongId === undefined && Icon !== undefined ? (
                  <span className="flex size-full items-center justify-center rounded bg-muted">
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                ) : (
                  <AlbumArtImage
                    songId={entry.pictureSongId}
                    thumbSize={ThumbnailSize.thumb256}
                    className="size-full rounded object-cover"
                    fallback={
                      <span className="block size-full rounded bg-muted" />
                    }
                  />
                )}
              </div>
              <span className={cn(rowClass, "truncate")}>{entry.label}</span>
              <span
                className={cn(
                  headerClass,
                  "truncate text-xs text-muted-foreground tabular-nums"
                )}
              >
                {t("library.songCount", [entry.count])}
              </span>
            </div>
          );

          if (playlist !== undefined) {
            return (
              <PlaylistContextMenu
                key={entry.key}
                playlist={playlist}
                onRename={() => setRenaming(playlist)}
              >
                {tile}
              </PlaylistContextMenu>
            );
          }

          if (selection.kind === "playlist") {
            return <Fragment key={entry.key}>{tile}</Fragment>;
          }

          return (
            <SongContextMenu
              key={entry.key}
              songs={songsForSelection(songs, selection)}
            >
              {tile}
            </SongContextMenu>
          );
        })}
      </div>
      <PlaylistRenameDialog
        playlist={renaming}
        onClose={() => setRenaming(undefined)}
      />
    </>
  );
}

/** The icon a view's tiles show when an entry has no artwork. */
function iconFor(view: string): LucideIcon | undefined {
  switch (view) {
    case "genres":
      return Tags;
    case "playlists":
      return ListMusic;
    default:
      return undefined;
  }
}
