import { getStaticThumbnail } from "@/hooks/thumbnailQueryHooks";
import { Music } from "lucide-react";
import { useState, useEffect } from "react";

function AlbumArtCell({ songId }: { songId: string }) {
  const [art, setArt] = useState<string | null>(null);
  let revokeFn = () => {};

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { thumbnail, revoke } = await getStaticThumbnail(songId, "sm");
      revokeFn = revoke;

      if (!cancelled) {
        if (thumbnail) setArt(thumbnail);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [songId]);

  useEffect(() => {
    const eventName = `art-thumbnail-complete:${songId}`;
    let revokeFn = () => {};

    async function handleUpdate() {
      const { thumbnail, revoke } = await getStaticThumbnail(songId, "sm");
      revokeFn = revoke;
      if (thumbnail) setArt(thumbnail);
    }

    window.addEventListener(eventName, handleUpdate);

    return () => {
      window.removeEventListener(eventName, handleUpdate);
      revokeFn();
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
