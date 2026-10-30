import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Song } from "@/models";
import { useMemo, type ReactElement } from "react";
import { wmmBus } from "@/core/events";
import {
  ListPlus,
  MinusCircle,
  Pause,
  Pen,
  PencilRuler,
  Play,
  PlusCircle,
} from "lucide-react";
import { usePlayback, useSync } from "@/hooks";
import { useLocation, useParams } from "react-router";

export function SongContextMenu({
  songs,
  children,
}: {
  songs: Song[];
  children: ReactElement;
}) {
  const { mode } = useParams();
  const { pathname } = useLocation();
  const { queuedSongs, devices } = useSync();
  const { nowPlaying, isPlaying } = usePlayback();

  const song = songs[0];

  const isQueued = useMemo(() => {
    const queuedIds = new Set(queuedSongs.map((x) => x.id));

    return songs.every((song) => queuedIds.has(song.id));
  }, [queuedSongs, songs]);

  const isNowPlaying = useMemo(
    () => song && nowPlaying?.id === song.id && isPlaying,
    [song, nowPlaying, isPlaying]
  );

  const isInSyncPage = useMemo(() => pathname.includes("sync"), [pathname]);

  function onItemClick(callback: () => void) {
    wmmBus.publish("wmm.ui.selectionChanged", {
      songIds: songs.map((x) => x.id),
    });
    callback();
  }

  const isPlaybackHidden =
    (mode !== undefined && mode !== "playback") || isInSyncPage;

  const isEditHidden = mode !== "edit" || isInSyncPage;
  const hasConnectedDevices = devices.length > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger render={children} />

      <ContextMenuContent className="w-56 select-none">
        <ContextMenuGroup hidden={isPlaybackHidden}>
          <ContextMenuLabel>Playback</ContextMenuLabel>
          <ContextMenuItem
            onClick={() =>
              onItemClick(() =>
                isNowPlaying
                  ? wmmBus.invoke("wmm.playback.playpause")
                  : wmmBus.invoke("wmm.playback.playSong", { songId: song.id })
              )
            }
          >
            {isNowPlaying ? (
              <>
                <Pause className="fill-foreground" />
                Pause
              </>
            ) : (
              <>
                <Play className="fill-foreground" />
                {songs.length == 1 ? "Play Song" : "Play All"}
              </>
            )}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() =>
              onItemClick(() =>
                wmmBus.invoke("wmm.playlists.addSong", { songId: song.id })
              )
            }
          >
            <ListPlus />
            Add To Playlist
          </ContextMenuItem>
        </ContextMenuGroup>

        <ContextMenuSeparator hidden={isPlaybackHidden} />

        <ContextMenuGroup hidden={isEditHidden}>
          <ContextMenuLabel>Editing</ContextMenuLabel>
          <ContextMenuItem
            onClick={() =>
              onItemClick(() =>
                wmmBus.invoke("wmm.library.song.quickEdit", {
                  songIds: songs.map((s) => s.id),
                })
              )
            }
          >
            <Pen />
            Quick Edit
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() =>
              wmmBus.invoke("wmm.library.song.edit", { songId: song.id })
            }
          >
            <PencilRuler />
            Advanced Edit
          </ContextMenuItem>
        </ContextMenuGroup>

        <ContextMenuSeparator hidden={isEditHidden || !hasConnectedDevices} />

        <ContextMenuGroup hidden={!hasConnectedDevices}>
          <ContextMenuLabel>Sync</ContextMenuLabel>
          {isQueued ? (
            <ContextMenuItem
              onClick={() =>
                onItemClick(() =>
                  wmmBus.invoke("wmm.sync.dequeueSongs", {
                    songIds: songs.map((s) => s.id),
                  })
                )
              }
            >
              <MinusCircle /> Remove From Queue
            </ContextMenuItem>
          ) : (
            <ContextMenuItem
              onClick={() =>
                onItemClick(() =>
                  wmmBus.invoke("wmm.sync.queueSongs", {
                    songIds: songs.map((s) => s.id),
                  })
                )
              }
            >
              <PlusCircle /> Add To Queue
            </ContextMenuItem>
          )}
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
