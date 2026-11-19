import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "cn";
import { Pen, Play, Plus, Trash2 } from "lucide-react";
import { NewPlaylistDialog } from "@/components/new-playlist-dialog";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSourcesStore } from "@/core/ports";
import {
  deletePlaylist,
  isPlaylistReadOnly,
  savePlaylist,
} from "@/core/playlists";
import { wmmBus } from "@/events";
import { useTranslation } from "@/i18n";
import type { MusicSource, Playlist } from "@/models";
import { useLibrarySelection } from "./librarySelection";
import type { LibrarySelection } from "./librarySelection";

/**
 * Whether a playlist's source refuses edits, as a function so a row can ask
 * without loading the sources itself.
 *
 * @example
 * ```xml
 * <Playlist editable="true" artwork="true" />
 * ```
 * @example
 * ```ts
 * const readOnly = usePlaylistReadOnly();
 * readOnly(playlist); // false for an app-created playlist
 * ```
 */
export function usePlaylistReadOnly(): (
  playlist: Pick<Playlist, "sourceId">
) => boolean {
  const [sources, setSources] = useState<MusicSource[]>([]);

  useEffect(() => {
    let cancelled = false;
    getSourcesStore()
      .getSources()
      .then((next) => {
        if (!cancelled) setSources(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return useCallback(
    (playlist: Pick<Playlist, "sourceId">) =>
      isPlaylistReadOnly(playlist, sources),
    [sources]
  );
}

/**
 * The new-playlist dialog and the flag that opens it, for a surface that
 * cannot wrap a button around it, such as a tree row.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="playlists artists" display="tree" />
 * ```
 * @example
 * ```ts
 * const { setOpen, dialog } = useNewPlaylistDialog();
 * setOpen(true);
 * ```
 */
export interface NewPlaylistDialogHandle {
  /** Whether the dialog is open. */
  readonly open: boolean;
  /** Opens or closes the dialog. */
  readonly setOpen: (open: boolean) => void;
  /** The dialog element to render beside the surface. */
  readonly dialog: ReactElement;
}

/**
 * Creates a playlist from a name and selects it on the page, so the page's
 * `TrackList` shows the new, empty playlist.
 *
 * @example
 * ```xml
 * <Playlist editable="true" />
 * ```
 * @example
 * ```ts
 * const { open, setOpen, dialog } = useNewPlaylistDialog();
 * ```
 */
export function useNewPlaylistDialog(): NewPlaylistDialogHandle {
  const { select } = useLibrarySelection();
  const [open, setOpen] = useState(false);

  const create = useCallback(
    async (name: string) => {
      const created = await savePlaylist({ name, songs: [] });
      select({ kind: "playlist", id: created.id });
    },
    [select]
  );

  return {
    open,
    setOpen,
    dialog: (
      <NewPlaylistDialog open={open} onOpenChange={setOpen} onCreate={create} />
    ),
  };
}

/**
 * What {@link NewPlaylistButton} takes: the label, the class and an optional
 * icon in place of the plus.
 *
 * @example
 * ```xml
 * <Playlist editable="true" rowText="@text/body" />
 * ```
 * @example
 * ```tsx
 * <NewPlaylistButton label="New playlist" />
 * ```
 */
export interface NewPlaylistButtonProps {
  /** The text the button shows; the new-playlist label when omitted. */
  readonly label?: string;
  /** The class of the button. */
  readonly className?: string;
  /** The icon to show before the label; a plus when omitted. */
  readonly children?: ReactNode;
}

/**
 * A button that opens the new-playlist dialog and selects the playlist it
 * creates.
 *
 * @example
 * ```xml
 * <Playlist editable="true" />
 * ```
 * @example
 * ```tsx
 * <NewPlaylistButton className="text-xs" />
 * ```
 */
export function NewPlaylistButton({
  label,
  className,
  children,
}: NewPlaylistButtonProps) {
  const { t } = useTranslation();
  const { setOpen, dialog } = useNewPlaylistDialog();

  return (
    <>
      <button
        type="button"
        className={cn(
          "flex min-w-0 cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground",
          className
        )}
        onClick={() => setOpen(true)}
      >
        {children ?? <Plus aria-hidden="true" className="size-4 shrink-0" />}
        <span className="min-w-0 truncate">{label ?? t("playlist.new")}</span>
      </button>
      {dialog}
    </>
  );
}

/**
 * What {@link PlaylistContextMenu} takes: the playlist, the callback that
 * starts a rename, the selection to fall back to after a delete, and the row
 * the menu belongs to.
 *
 * @example
 * ```xml
 * <Playlist editable="true" artwork="true" />
 * ```
 * @example
 * ```tsx
 * <PlaylistContextMenu playlist={playlist} onRename={() => setRenaming(playlist.id)}>
 *   <button type="button">{playlist.name}</button>
 * </PlaylistContextMenu>
 * ```
 */
export interface PlaylistContextMenuProps {
  /** The playlist the actions apply to. */
  readonly playlist: Playlist;
  /** Called when Rename is chosen. */
  readonly onRename: () => void;
  /** The selection the page falls back to when this playlist is deleted. */
  readonly afterDelete?: LibrarySelection;
  /** The row the menu opens on. */
  readonly children: ReactElement;
}

/**
 * The playlist actions as a context menu: play, rename and delete. Rename and
 * delete are disabled for a playlist its source keeps read-only, and delete
 * asks first, with the same wording as the built-in playlists page.
 *
 * @example
 * ```xml
 * <Playlist editable="true" />
 * ```
 * @example
 * ```tsx
 * <PlaylistContextMenu playlist={playlist} onRename={rename}>
 *   <span>{playlist.name}</span>
 * </PlaylistContextMenu>
 * ```
 */
export function PlaylistContextMenu({
  playlist,
  onRename,
  afterDelete,
  children,
}: PlaylistContextMenuProps) {
  const { t } = useTranslation();
  const readOnly = usePlaylistReadOnly()(playlist);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const songIds = playlist.songs.map((entry) => entry.songId);

  function play(): void {
    if (songIds.length === 0) return;
    wmmBus.invoke("wmm.playback.playCollection", { songIds });
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger render={children} />
        <ContextMenuContent className="w-52 select-none">
          <ContextMenuItem disabled={songIds.length === 0} onClick={play}>
            <Play className="fill-foreground" />
            {t("playback.playAll")}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem disabled={readOnly} onClick={onRename}>
            <Pen />
            {t("playlist.rename")}
          </ContextMenuItem>
          <ContextMenuItem
            disabled={readOnly || playlist.isFavorites === true}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 />
            {t("playlist.delete")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <PlaylistDeleteDialog
        playlist={confirmOpen ? playlist : undefined}
        afterDelete={afterDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}

/**
 * What {@link PlaylistDeleteDialog} takes: the playlist to delete, or
 * undefined to keep the dialog closed, the selection to fall back to, and the
 * callback that closes it.
 *
 * @example
 * ```xml
 * <Playlist editable="true" />
 * ```
 * @example
 * ```tsx
 * <PlaylistDeleteDialog playlist={pending} onClose={() => setPending(undefined)} />
 * ```
 */
export interface PlaylistDeleteDialogProps {
  /** The playlist to delete; the dialog is closed while undefined. */
  readonly playlist?: Playlist;
  /** The selection the page falls back to once the playlist is gone. */
  readonly afterDelete?: LibrarySelection;
  /** Called when the dialog closes, whether it deleted or not. */
  readonly onClose: () => void;
}

/**
 * The delete confirmation the playlists page uses, with its wording, for a
 * surface that reaches delete without the context menu.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="playlists" display="tree" />
 * ```
 * @example
 * ```tsx
 * <PlaylistDeleteDialog playlist={pending} onClose={close} />
 * ```
 */
export function PlaylistDeleteDialog({
  playlist,
  afterDelete,
  onClose,
}: PlaylistDeleteDialogProps) {
  const { t } = useTranslation();
  const { state, select } = useLibrarySelection();

  async function remove(): Promise<void> {
    if (playlist === undefined) return;
    onClose();
    if (
      state.selection.kind === "playlist" &&
      state.selection.id === playlist.id
    ) {
      select(afterDelete ?? { kind: "all" });
    }
    await deletePlaylist(playlist.id);
  }

  return (
    <Dialog
      open={playlist !== undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-lg select-none">
        <DialogHeader>
          <DialogTitle>{t("playlist.deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("playlist.deleteDescription", [playlist?.name ?? ""])}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline">{t("common.cancel")}</Button>}
          />

          <Button variant="destructive" onClick={() => void remove()}>
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * What {@link PlaylistNameEditor} takes: the playlist being renamed, the class
 * of the field and the callback that ends the edit.
 *
 * @example
 * ```xml
 * <Playlist editable="true" />
 * ```
 * @example
 * ```tsx
 * <PlaylistNameEditor playlist={playlist} onDone={() => setRenaming(undefined)} />
 * ```
 */
export interface PlaylistNameEditorProps {
  /** The playlist whose name the field edits. */
  readonly playlist: Playlist;
  /** The class of the field, so it matches the row it replaces. */
  readonly className?: string;
  /** Called once the edit ends, whether it saved or not. */
  readonly onDone: () => void;
}

/**
 * An inline field over a playlist's name. It takes the focus and selects the
 * name when it appears, Enter and leaving the field save a changed name, and
 * Escape cancels. The text stays selectable inside a page that does not
 * select text.
 *
 * @example
 * ```xml
 * <Playlist editable="true" rowText="@text/body" />
 * ```
 * @example
 * ```tsx
 * <PlaylistNameEditor playlist={playlist} className={rowClass} onDone={done} />
 * ```
 */
export function PlaylistNameEditor({
  playlist,
  className,
  onDone,
}: PlaylistNameEditorProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(playlist.name);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const input = inputRef.current;
    if (input === null) return;
    input.focus();
    input.select();
  }, []);

  function finish(save: boolean): void {
    if (doneRef.current) return;
    doneRef.current = true;
    const trimmed = value.trim();
    onDone();
    if (!save || trimmed === "" || trimmed === playlist.name) return;
    void savePlaylist({ id: playlist.id, name: trimmed });
  }

  return (
    <input
      ref={inputRef}
      value={value}
      aria-label={t("playlist.name")}
      placeholder={t("playlist.name")}
      className={cn(
        "min-w-0 flex-1 select-text rounded-sm bg-transparent px-1 py-0 text-inherit outline-none ring-1 ring-ring",
        className
      )}
      onChange={(event) => setValue(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          finish(true);
        } else if (event.key === "Escape") {
          event.preventDefault();
          finish(false);
        }
      }}
      onBlur={() => finish(true)}
    />
  );
}

/**
 * What {@link PlaylistRenameDialog} takes: the playlist to rename, or
 * undefined to keep the dialog closed, and the callback that closes it.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="playlists" display="list" />
 * ```
 * @example
 * ```tsx
 * <PlaylistRenameDialog playlist={renaming} onClose={() => setRenaming(undefined)} />
 * ```
 */
export interface PlaylistRenameDialogProps {
  /** The playlist being renamed; the dialog is closed while undefined. */
  readonly playlist?: Playlist;
  /** Called when the dialog closes, whether it saved or not. */
  readonly onClose: () => void;
}

/**
 * Renames a playlist through the new-playlist dialog, pre-filled with its
 * current name, for surfaces that have no room for an inline field.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="playlists artists" display="grid" />
 * ```
 * @example
 * ```tsx
 * <PlaylistRenameDialog playlist={renaming} onClose={close} />
 * ```
 */
export function PlaylistRenameDialog({
  playlist,
  onClose,
}: PlaylistRenameDialogProps) {
  return (
    <NewPlaylistDialog
      open={playlist !== undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      initialName={playlist?.name}
      onCreate={async (name) => {
        if (playlist === undefined) return;
        await savePlaylist({ id: playlist.id, name });
      }}
    />
  );
}
