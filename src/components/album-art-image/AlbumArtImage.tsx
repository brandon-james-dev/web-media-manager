import { useEffect, useState, useRef } from "react";
import { backgroundService } from "@/lib/background-jobs";
import { getPicturesForSongOfType } from "@/lib";
import type { AlbumArtImageProps } from "./AlbumArtImageProps";

export function AlbumArtImage(props: AlbumArtImageProps) {
  const { songId, artworkType, thumbSize, fallback, className } = props;
  const [artwork, setArtwork] = useState<string | null>(null);
  const loadingRef = useRef(false);

  // Load artwork once
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!songId) {
        setArtwork(null);
        loadingRef.current = false;
        return;
      }

      loadingRef.current = true;

      const picture = await getPicturesForSongOfType(
        songId,
        artworkType,
        thumbSize
      );

      if (!cancelled) {
        if (picture) {
          const blob = new Blob([picture.data.slice()]);
          setArtwork(URL.createObjectURL(blob));
        } else {
          setArtwork(null);
        }
      }

      loadingRef.current = false;
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [songId, artworkType, thumbSize]);

  // Refresh when artwork job completes
  useEffect(() => {
    const eventName = `artwork-complete:${songId}`;

    const unsub = backgroundService.onCustom(eventName, async () => {
      if (loadingRef.current) return;
      if (!songId) {
        setArtwork(null);
        loadingRef.current = false;
        return;
      }

      loadingRef.current = true;

      const picture = await getPicturesForSongOfType(
        songId,
        artworkType,
        thumbSize
      );

      if (picture) {
        const blob = new Blob([picture.data.slice()]);
        setArtwork(URL.createObjectURL(blob));
      } else {
        setArtwork(null);
      }

      loadingRef.current = false;
    });

    return () => unsub();
  }, [songId, artworkType, thumbSize]);

  if (!artwork) {
    return (
      fallback ?? (
        <div className="bg-zinc-300 dark:bg-zinc-700 rounded flex justify-center items-center">
          <span>No artwork</span>
        </div>
      )
    );
  }

  return (
    <img
      src={artwork}
      draggable={false}
      className={className ?? "rounded object-cover"}
    />
  );
}
