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
import {
  quickEditSongs$,
  advancedEditSong$,
  addSongToPlaylist$,
  playSong$,
  pausePlayback$,
  songsSelected$,
} from "@/events/song-events";
import { dequeueSongs$, queueSongs$ } from "@/events";
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
  const { queuedSongs } = useSync();
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
    songsSelected$.next(songs.map((x) => x.id));
    callback();
  }

  const isPlaybackHidden =
    (mode !== undefined && mode !== "playback") || isInSyncPage;

  const isEditHidden = mode !== "edit" || isInSyncPage;

  return (
    <ContextMenu>
      <ContextMenuTrigger render={children} />

      <ContextMenuContent className="w-56 select-none">
        <ContextMenuGroup hidden={isPlaybackHidden}>
          <ContextMenuLabel>Playback</ContextMenuLabel>
          <ContextMenuItem
            onClick={() =>
              onItemClick(() =>
                isNowPlaying ? pausePlayback$.next(true) : playSong$.next(song)
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
            onClick={() => onItemClick(() => addSongToPlaylist$.next(song))}
          >
            <ListPlus />
            Add To Playlist
          </ContextMenuItem>
        </ContextMenuGroup>

        <ContextMenuSeparator hidden={isPlaybackHidden} />

        <ContextMenuGroup hidden={isEditHidden}>
          <ContextMenuLabel>Editing</ContextMenuLabel>
          <ContextMenuItem
            onClick={() => onItemClick(() => quickEditSongs$.next(songs))}
          >
            <Pen />
            Quick Edit
          </ContextMenuItem>

          <ContextMenuItem onClick={() => advancedEditSong$.next(song)}>
            <PencilRuler />
            Advanced Edit
          </ContextMenuItem>
        </ContextMenuGroup>

        <ContextMenuSeparator hidden={isEditHidden} />

        <ContextMenuGroup>
          <ContextMenuLabel>Sync</ContextMenuLabel>
          {isQueued ? (
            <ContextMenuItem
              onClick={() => onItemClick(() => dequeueSongs$.next(songs))}
            >
              <MinusCircle /> Remove From Queue
            </ContextMenuItem>
          ) : (
            <ContextMenuItem
              onClick={() => onItemClick(() => queueSongs$.next(songs))}
            >
              <PlusCircle /> Add To Queue
            </ContextMenuItem>
          )}
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
