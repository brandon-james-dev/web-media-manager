import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "cn";
import { AlbumArtImage } from "@/components/album-art-image";
import { useSidebarPlaylists } from "@/components/library-sidebar/useSidebarPlaylists";
import { useSongs } from "@/hooks";
import { useTranslation } from "@/i18n";
import { ThumbnailSize } from "@/lib";
import { attrBool } from "@/lib/themes/render";
import type { ElementProps } from "@/lib/themes/render/browser";
import type { Playlist } from "@/models";
import { useThemeTextClass } from "../../shared/themeText";
import { WidgetFrame } from "../../shared/WidgetFrame";
import { useLibrarySelection } from "../shared/librarySelection";
import {
  NewPlaylistButton,
  PlaylistContextMenu,
  PlaylistDeleteDialog,
  PlaylistNameEditor,
  usePlaylistReadOnly,
} from "../shared/PlaylistActions";

/**
 * The playlists of the library. Picking one makes the page's `TrackList` show
 * its songs, and `artwork` puts a cover on each row. With `editable` the
 * widget adds a new-playlist button and each row opens a context menu with
 * play, rename and delete; F2 renames the focused row in place and Delete
 * asks before deleting it.
 *
 * @example
 * ```xml
 * <Playlist artwork="true" rowText="@text/body" panel="@panel/inset" />
 * <Playlist artwork="false" rowText="@text/glass-title" editable="false" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={playlist} />
 * ```
 */
export function ThemePlaylist({ node, style }: ElementProps) {
  const { t } = useTranslation();
  const { songs } = useSongs();
  const playlists = useSidebarPlaylists();
  const { state, select } = useLibrarySelection();
  const rowClass = useThemeTextClass(node, "rowText");
  const readOnly = usePlaylistReadOnly();

  const showArtwork = attrBool(node, "artwork") ?? false;
  const editable = attrBool(node, "editable") ?? true;
  const [renamingId, setRenamingId] = useState<string | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<Playlist | undefined>(
    undefined
  );

  const selection = state.selection;

  const pictures = useMemo(() => {
    const map = new Map<string, string>();
    for (const song of songs) {
      if (song.pictures?.length) map.set(song.id, song.id);
    }
    return map;
  }, [songs]);

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    playlist: Playlist
  ): void {
    if (event.key === "F2") {
      event.preventDefault();
      if (!editable || readOnly(playlist)) return;
      setRenamingId(playlist.id);
      return;
    }
    if (event.key === "Delete") {
      event.preventDefault();
      if (!editable || readOnly(playlist) || playlist.isFavorites === true) {
        return;
      }
      setPendingDelete(playlist);
    }
  }

  return (
    <WidgetFrame node={node} style={style}>
      {editable ? (
        <div className="flex shrink-0 items-center gap-1 pb-1">
          <NewPlaylistButton className="text-xs" />
        </div>
      ) : null}
      {playlists.length === 0 ? (
        <span className="flex min-h-0 min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
          {t("library.noResults")}
        </span>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {playlists.map((playlist) => {
            const selected =
              selection.kind === "playlist" && selection.id === playlist.id;
            const pictureSongId = playlist.songs
              .map((entry) => pictures.get(entry.songId))
              .find((id) => id !== undefined);
            const renaming = renamingId === playlist.id;
            const rowClassName = cn(
              "flex min-w-0 cursor-default select-none items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors",
              selected
                ? "bg-accent/15 text-foreground"
                : "text-muted-foreground hover:bg-accent/10"
            );
            const content = (
              <>
                {showArtwork ? (
                  <AlbumArtImage
                    songId={pictureSongId}
                    thumbSize={ThumbnailSize.thumb64}
                    className="size-8 shrink-0 rounded bg-muted"
                    fallback={
                      <span className="block size-8 shrink-0 rounded bg-muted" />
                    }
                  />
                ) : null}
                <span className="flex min-w-0 flex-col">
                  {renaming ? (
                    <PlaylistNameEditor
                      playlist={playlist}
                      className={rowClass}
                      onDone={() => setRenamingId(undefined)}
                    />
                  ) : (
                    <span className={cn(rowClass, "truncate")}>
                      {playlist.name}
                    </span>
                  )}
                  <span className="truncate text-xs text-muted-foreground tabular-nums">
                    {t("library.songCount", [playlist.songs.length])}
                  </span>
                </span>
              </>
            );

            return (
              <PlaylistContextMenu
                key={playlist.id}
                playlist={playlist}
                onRename={() => setRenamingId(playlist.id)}
              >
                {renaming ? (
                  <div className={rowClassName}>{content}</div>
                ) : (
                  <button
                    type="button"
                    className={rowClassName}
                    aria-pressed={selected}
                    onClick={() =>
                      select({ kind: "playlist", id: playlist.id })
                    }
                    onKeyDown={(event) => handleRowKeyDown(event, playlist)}
                  >
                    {content}
                  </button>
                )}
              </PlaylistContextMenu>
            );
          })}
        </div>
      )}
      <PlaylistDeleteDialog
        playlist={pendingDelete}
        onClose={() => setPendingDelete(undefined)}
      />
    </WidgetFrame>
  );
}
