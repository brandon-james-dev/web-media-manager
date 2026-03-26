import { useEffect, useState } from "react";
import { Music } from "lucide-react";
import { getStaticThumbnail } from "@/hooks/thumbnailQueryHooks";
import type { Album } from "./types";
import { useSongsByAlbumInDb } from "@/hooks/songQueryHooks";

interface AlbumArtProps {
  album: Album;
}

export function AlbumArt({ album }: AlbumArtProps) {
  const [art, setArt] = useState<string | null>(album.art ?? null);

  const songsByAlbum = useSongsByAlbumInDb(album.albumName);
  const primarySong = songsByAlbum?.at(0);
  const songId = primarySong?.id;

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!songId) return;
      const { thumbXLarge } = await getStaticThumbnail(songId);
      if (!cancelled) {
        setArt(thumbXLarge ?? null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [songId]);

  useEffect(() => {
    const eventName = `pending-art-complete:album:${album.albumName}`;

    const handleUpdate = async (evt: Event) => {
      const e = evt as CustomEvent<{ songId: string }>;
      if (e.detail.songId === songId) {
        const { thumbXLarge } = await getStaticThumbnail(songId);
        setArt(thumbXLarge ?? null);
      }
    };

    window.addEventListener(eventName, handleUpdate);

    return () => {
      window.removeEventListener(eventName, handleUpdate);
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
