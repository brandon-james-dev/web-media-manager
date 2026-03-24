"use client";

import { useState } from "react";
import { getStaticThumbnail } from "@/hooks/thumbnailQueryHooks";
import { resizeBitmap } from "@/lib/albumArt";

export function useAlbumArt(primarySong: any, form: any) {
  const [previewArt, setPreviewArt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);

  async function resetAlbumArt() {
    if (!primarySong) return;

    const art = await getStaticThumbnail(primarySong.id);

    if (art.thumbLarge) {
      setPreviewArt(art.thumbLarge);
      form.setValue("picture", [art.thumbLarge]);
    } else {
      setPreviewArt(null);
      form.setValue("picture", undefined);
    }
  }

  async function setArt(bytes: Uint8Array) {
    const blob = new Blob([bytes] as BlobPart[]);
    const bitmap = await createImageBitmap(blob);
    const resized = await resizeBitmap(bitmap, 128);

    const previewUrl = URL.createObjectURL(resized);
    setPreviewArt(previewUrl);
  }

  return {
    previewArt,
    setPreviewArt,
    isLoading,
    setIsLoading,
    downloadComplete,
    setDownloadComplete,
    resetAlbumArt,
    setArt,
  };
}
