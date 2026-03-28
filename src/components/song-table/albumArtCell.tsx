import { getStaticThumbnail } from "@/hooks/thumbnailQueryHooks";
import { Music } from "lucide-react";
import { useState, useEffect, useRef } from "react";

function AlbumArtCell({ songId }: { songId: string }) {
  const [art, setArt] = useState<string | null>(null);
  const revokeRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { thumbnail, revoke } = await getStaticThumbnail(songId, "sm");

      if (cancelled) return;

      revokeRef.current();

      revokeRef.current = revoke;
      setArt(thumbnail || null);
    }

    load();

    return () => {
      cancelled = true;
      revokeRef.current();
    };
  }, [songId]);

  useEffect(() => {
    const eventName = `art-thumbnail-complete:${songId}`;

    const handler = async () => {
      const { thumbnail, revoke } = await getStaticThumbnail(songId, "sm");

      revokeRef.current();

      revokeRef.current = revoke;
      setArt(thumbnail ?? null);
    };

    window.addEventListener(eventName, handler);

    return () => {
      window.removeEventListener(eventName, handler);
      revokeRef.current();
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