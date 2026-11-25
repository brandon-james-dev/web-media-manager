import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Song } from "@/models";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { useIsMobile, useIsPhoneLandscape } from "@/hooks/useIsMobile";
import { useTranslation } from "@/i18n";
import { NewPlaylistDialog } from "@/components/new-playlist-dialog";
import { useSongMenu, type SongMenuAction } from "./songMenuItems";

/**
 * Right-click / long-press menu for one or more songs.
 *
 * The menu itself is expensive to build: `useSongMenu` reads the playlist
 * store, subscribes to several stores and resolves the page selection. A list
 * page mounts one of these per row, so building it eagerly cost a database
 * read and a handful of subscriptions per song — thousands of them on a large
 * library, which is what made the All Artists view slow to open.
 *
 * So the trigger is always mounted (it has to be, to catch the gesture) and
 * the surface — hook included — only mounts the first time the menu opens,
 * then stays mounted so reopening is instant and the drawer keeps its exit
 * animation.
 */
export function SongContextMenu({
  songs,
  playlistId,
  children,
}: {
  songs: Song[];
  playlistId?: string;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Both hooks run on every render: `a || b()` would skip the second hook's
  // internals whenever the first is true, and rotation flips that, which
  // changes the hook order and crashes the tree.
  const isMobileViewport = useIsMobile();
  const isPhoneLandscape = useIsPhoneLandscape();
  // A phone in landscape is wider than the mobile breakpoint but has no room
  // for a floating menu, so it keeps the drawer.
  const isMobile = isMobileViewport || isPhoneLandscape;

  function handleOpenChange(next: boolean) {
    if (next && !mounted) {
      // Mount the surface closed and open it on the next frame. Mounting it
      // already open gives the drawer no closed state to animate in from, so
      // the first open would appear instantly while later ones animate.
      setMounted(true);
      requestAnimationFrame(() => setOpen(true));
      return;
    }
    setOpen(next);
  }

  const surface = (
    <SongMenuSurface
      songs={songs}
      playlistId={playlistId}
      open={open}
      isMobile={isMobile}
      onOpenChange={handleOpenChange}
      onClose={() => setOpen(false)}
    />
  );

  return (
    <>
      <ContextMenu
        onOpenChange={(next) => {
          // Only the open edge matters here. The drawer is a sibling, so the
          // context menu's own outside-press close would otherwise tear the
          // drawer down on any click inside it.
          if (next) handleOpenChange(true);
        }}
      >
        <ContextMenuTrigger render={children} />
        {/* The floating menu must stay inside the root: its parts read
            MenuRootContext and throw without it. */}
        {mounted && !isMobile && surface}
      </ContextMenu>

      {/* The drawer sits outside the root on purpose: it is portalled to the
          body, so nesting it there made every press inside it an "outside
          press" for the context menu, which closed it on any click. */}
      {mounted && isMobile && surface}
    </>
  );
}

/** The menu contents, mounted on first open — see `SongContextMenu`. */
function SongMenuSurface({
  songs,
  playlistId,
  open,
  isMobile,
  onOpenChange,
  onClose,
}: {
  songs: Song[];
  playlistId?: string;
  open: boolean;
  isMobile: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}) {
  const menu = useSongMenu(songs, playlistId);
  const { t } = useTranslation();

  const song = songs[0];
  const visibleGroups = menu.groups.filter((group) => !group.hidden);

  // Resolve the live selection each time the surface opens. The hook is not
  // re-created per open, so read its latest callback through a ref.
  const onOpenRef = useRef(menu.onOpen);
  useEffect(() => {
    onOpenRef.current = menu.onOpen;
  });
  useEffect(() => {
    if (open) onOpenRef.current(true);
  }, [open]);

  /** Run an action and dismiss the surface it was chosen from. */
  function run(action: SongMenuAction) {
    onClose();
    action.onSelect();
  }

  return (
    <>
      {!isMobile && (
        <ContextMenuContent className="w-56 select-none">
          {visibleGroups.map((group, index) => (
            <ContextMenuGroup key={group.id}>
              {index > 0 && <ContextMenuSeparator />}
              {group.label && (
                <ContextMenuLabel>{group.label}</ContextMenuLabel>
              )}

              {group.actions
                .filter((action) => !action.hidden)
                .map((action) => (
                  <ContextMenuItem
                    key={action.id}
                    disabled={action.disabled}
                    onClick={() => run(action)}
                  >
                    {action.icon}
                    {action.label}
                    {action.trailing}
                  </ContextMenuItem>
                ))}

              {group.submenu && (
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    {group.submenu.icon}
                    {group.submenu.label}
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-52 select-none">
                    {group.submenu.actions.map((action) => (
                      <ContextMenuItem
                        key={action.id}
                        onClick={() => run(action)}
                      >
                        {action.icon}
                        <span className="min-w-0 flex-1 truncate">
                          {action.label}
                        </span>
                        {action.trailing}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              )}
            </ContextMenuGroup>
          ))}
        </ContextMenuContent>
      )}

      {isMobile && (
        <Drawer
          open={open}
          onOpenChange={onOpenChange}
          swipeDirection="down"
          showSwipeHandle
        >
          <DrawerContent
            // About half the player bar, so the sheet reads as a compact menu
            // rather than spanning the whole playback component.
            className="mx-auto w-full max-w-90 select-none"
          >
            <DrawerHeader className="pb-1 select-none">
              <DrawerTitle className="truncate text-sm select-none [-webkit-touch-callout:none]">
                {menu.target.length > 1
                  ? t("library.songCount", [menu.target.length])
                  : (song?.title ?? t("library.song"))}
              </DrawerTitle>
            </DrawerHeader>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
              {visibleGroups.map((group) => (
                <div key={group.id} className="border-b py-1 last:border-b-0">
                  {group.label && (
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                      {group.label}
                    </div>
                  )}

                  {group.actions
                    .filter((action) => !action.hidden)
                    .map((action) => (
                      <DrawerAction
                        key={action.id}
                        action={action}
                        onSelect={() => run(action)}
                      />
                    ))}

                  {group.submenu && (
                    <>
                      <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                        {group.submenu.icon}
                        {group.submenu.label}
                      </div>
                      {group.submenu.actions.map((action) => (
                        <DrawerAction
                          key={action.id}
                          action={action}
                          onSelect={() => run(action)}
                        />
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <NewPlaylistDialog
        open={menu.newPlaylistOpen}
        onOpenChange={menu.setNewPlaylistOpen}
        onCreate={menu.createPlaylist}
        songCount={menu.target.length}
      />
    </>
  );
}

/** One drawer row, matching the context menu's icon-and-label layout. */
function DrawerAction({
  action,
  onSelect,
}: {
  action: SongMenuAction;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={action.disabled}
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent/40 disabled:pointer-events-none disabled:opacity-40"
    >
      {action.icon}
      <span className="min-w-0 flex-1 truncate">{action.label}</span>
      {action.trailing}
    </button>
  );
}
