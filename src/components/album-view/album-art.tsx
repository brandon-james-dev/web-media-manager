import { useEffect, useRef, useState } from "react";
import { Music } from "lucide-react";
import { getStaticThumbnail } from "@/hooks/thumbnailQueryHooks";
import type { Album } from "./types";
import { useSongsByAlbumInDb } from "@/hooks/songQueryHooks";

interface AlbumArtProps {
  album: Album;
}

export function AlbumArt({ album }: AlbumArtProps) {
  const [art, setArt] = useState<string | null>(album.art ?? null);
  const revokeRef = useRef<() => void>(() => {});

  const songsByAlbum = useSongsByAlbumInDb(album.albumName);
  const primarySong = songsByAlbum?.at(0);
  const songId = primarySong?.id;

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!songId) return;
      const { thumbnail, revoke } = await getStaticThumbnail(songId, "xl");

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
    const eventName = `art-thumbnail-complete:album:${album.albumName}`;

    const handleUpdate = async (evt: Event) => {
      const e = evt as CustomEvent<{ songId: string }>;

      if (album.songs.map((s) => s.id).includes(e.detail.songId)) {
        const { thumbnail, revoke } = await getStaticThumbnail(
          e.detail.songId,
          "xl",
        );

        revokeRef.current();

        revokeRef.current = revoke;
        if (thumbnail) setArt(thumbnail);
      }
    };

    window.addEventListener(eventName, handleUpdate);

    return () => {
      window.removeEventListener(eventName, handleUpdate);
      revokeRef.current();
    };
  }, [album, songId]);

  return (
    <>
      {art && (
        <img
          src={art}
          draggable={false}
          className="w-full aspect-square object-cover"
        />
      )}

      {!art && (
        <div className="aspect-square w-full flex justify-center items-center dark:bg-zinc-500 bg-zinc-200">
          <Music />
        </div>
      )}
    </>
  );
}
