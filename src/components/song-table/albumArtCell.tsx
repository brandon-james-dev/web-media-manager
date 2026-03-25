import { db } from "@/data/MediaDb";
import { subscribeToAlbumArtEvents } from "@/lib/albumArtWorkerClient";
import { Music } from "lucide-react";
import { useState, useEffect } from "react";

function AlbumArtCell({ songId }: { songId: string }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const art = await db.thumbnails.get(songId);

      if (!cancelled) {
        setBlob(art?.thumbSmall ?? null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [songId]);

  useEffect(() => {
    return subscribeToAlbumArtEvents(async (msg) => {
      if (msg.songId !== songId) return;

      if (
        msg.type === "art-ready" ||
        msg.type === "write-complete" ||
        msg.type === "pending-art-complete"
      ) {
        const art = await db.thumbnails.get(songId);
        setBlob(art?.thumbSmall ?? null);
      }
    });
  }, [songId]);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(blob);
    setUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [blob]);

  if (!url) {
    return (
      <div className="h-12 w-12 bg-zinc-300 dark:bg-zinc-700 rounded flex justify-center items-center">
        <Music />
      </div>
    );
  }

  return (
    <img
      src={url}
      draggable={false}
      className="h-12 w-12 rounded object-cover"
    />
  );
}

export { AlbumArtCell };
