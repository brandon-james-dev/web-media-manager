import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ListMusic, MonitorSmartphone, X } from "lucide-react";
import { Playlists } from "@/pages/Main/Playlists";
import { Sync } from "@/pages/Main/Sync";
import { SidebarPlaylistTracks } from "./SidebarPlaylistTracks";

/** Which compact view the sidebar is showing. */
export type SidebarView = "playlists" | "sync";

interface LibrarySidebarProps {
  view: SidebarView;
  onClose: () => void;
}

/**
 * The right sidebar: the playlists or sync page in its compact form.
 *
 * The chrome (title, close) lives here; the list itself is the page's
 * own compact variant, so the sidebar and the full page never drift apart.
 */
export function LibrarySidebar({ view, onClose }: LibrarySidebarProps) {
  const [openPlaylistId, setOpenPlaylistId] = useState<string>();

  const isPlaylists = view === "playlists";

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        {isPlaylists ? (
          <ListMusic className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <MonitorSmartphone className="size-4 shrink-0" aria-hidden="true" />
        )}
        <span className="flex-1 truncate text-sm font-semibold">
          {isPlaylists ? "Playlists" : "Sync"}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0"
          title="Close sidebar"
          aria-label="Close sidebar"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {isPlaylists ? (
          openPlaylistId ? (
            <SidebarPlaylistTracks
              playlistId={openPlaylistId}
              onBack={() => setOpenPlaylistId(undefined)}
            />
          ) : (
            <Playlists compact onOpenPlaylist={setOpenPlaylistId} />
          )
        ) : (
          <Sync compact />
        )}
      </div>
    </div>
  );
}
