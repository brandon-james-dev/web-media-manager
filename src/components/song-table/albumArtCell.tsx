import { getStaticThumbnail } from "@/hooks/thumbnailQueryHooks";
import { Music } from "lucide-react";
import { useState, useEffect } from "react";

function AlbumArtCell({ songId }: { songId: string }) {
  const [art, setArt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { thumbSmall } = await getStaticThumbnail(songId);

      if (!cancelled) {
        setArt(thumbSmall ?? null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [songId]);

  useEffect(() => {
    const eventName = `pending-art-complete:${songId}`;

    async function handleUpdate() {
      const { thumbSmall } = await getStaticThumbnail(songId);
      setArt(thumbSmall ?? null);
    }

    window.addEventListener(eventName, handleUpdate);

    return () => {
      window.removeEventListener(eventName, handleUpdate);
    };
  }, [songId]);

  if (!art) {
    return (
      <div className="h-12 w-12 bg-zinc-300 dark:bg-zinc-700 rounded flex justify-center items-center">
        <Music />
      </div>
    );
  }

  return (
    <img
      src={art}
      draggable={false}
      className="h-12 w-12 rounded object-cover"
    />
  );
}

export { AlbumArtCell };
