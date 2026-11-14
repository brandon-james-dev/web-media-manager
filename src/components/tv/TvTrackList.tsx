import { ItemGroup } from "@/components/ui/item";
import { TrackItem } from "@/components/track-item";
import type { Song } from "@/models";
import { cn } from "cn";

export interface TvTrackListProps {
  songs: Song[];
  nowPlayingSongId?: string;
  onPlay: (song: Song) => void;
  className?: string;
}

/**
 * Television track list.
 *
 * Rows are the same TrackItem used on touch layouts, made focus stops so the
 * remote can walk them: artwork, title, artist — album, duration. Enter plays
 * the focused row, which is what the TV navigation layer does for a focused
 * non-native element.
 */
export function TvTrackList({
  songs,
  nowPlayingSongId,
  onPlay,
  className,
}: TvTrackListProps) {
  return (
    <ItemGroup
      className={cn(
        "gap-1! px-4 pb-6 has-data-[size=sm]:gap-1! has-data-[size=xs]:gap-1!",
        className
      )}
    >
      {songs.map((song, index) => (
        <TrackItem
          key={song.id}
          song={song}
          index={index}
          showArtwork
          focusable
          isPlaying={nowPlayingSongId === song.id}
          onClick={onPlay}
          onPlay={onPlay}
          className="py-1.5 [&_[data-slot=item-media]]:size-12 [&_[data-slot=item-title]]:text-base"
        />
      ))}
    </ItemGroup>
  );
}
