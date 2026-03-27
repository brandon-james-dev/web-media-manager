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
    let revokeFn = () => {};
    let cancelled = false;

    async function load() {
      if (!songId) return;
      const { thumbXLarge, revoke } = await getStaticThumbnail(songId, "xl");
      revokeFn = revoke;
      if (!cancelled) {
        if (thumbXLarge) setArt(thumbXLarge);
      }
    }

    load();
    return () => {
      cancelled = true;
      revokeFn();
    };
  }, [songId]);

  useEffect(() => {
    let revokeFn = () => {};
    const eventName = `pending-art-complete:album:${album.albumName}`;

    const handleUpdate = async (evt: Event) => {
      const e = evt as CustomEvent<{ songId: string }>;
      if (e.detail.songId === songId) {
        const { thumbXLarge, revoke } = await getStaticThumbnail(songId, "sm");
        revokeFn = revoke;
        if (thumbXLarge) setArt(thumbXLarge);
      }
    };

    window.addEventListener(eventName, handleUpdate);

    return () => {
      window.removeEventListener(eventName, handleUpdate);
      revokeFn();
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
