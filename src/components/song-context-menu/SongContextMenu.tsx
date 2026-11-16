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
import { useState, type ReactElement } from "react";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/i18n";
import { NewPlaylistDialog } from "@/components/new-playlist-dialog";
import { useSongMenu, type SongMenuAction } from "./songMenuItems";

export function SongContextMenu({
  songs,
  children,
}: {
  songs: Song[];
  children: ReactElement;
}) {
  const menu = useSongMenu(songs);
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const song = songs[0];
  const visibleGroups = menu.groups.filter((group) => !group.hidden);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    menu.onOpen(next);
  }

  /** Run an action and dismiss the surface it was chosen from. */
  function run(action: SongMenuAction) {
    setOpen(false);
    action.onSelect();
  }

  return (
    <>
      {/* The trigger owns long-press detection on touch, so the drawer is
          driven by the same open state the context menu uses. */}
      <ContextMenu onOpenChange={handleOpenChange}>
        <ContextMenuTrigger render={children} />

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
      </ContextMenu>

      {isMobile && (
        <Drawer
          open={open}
          onOpenChange={handleOpenChange}
          swipeDirection="down"
          showSwipeHandle
        >
          <DrawerContent
            className="mx-auto w-full max-w-md select-none"
            overlayClassName="z-70"
            viewportClassName="z-70"
          >
            <DrawerHeader className="pb-1">
              <DrawerTitle className="truncate text-sm">
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
