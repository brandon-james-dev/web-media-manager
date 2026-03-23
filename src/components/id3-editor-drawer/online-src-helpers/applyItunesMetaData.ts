"use client";

import type { MusicResult } from "itunes-web-api";
import { arrayBufferToBase64 } from "@/lib/utils";
import { downloadImageBytes, resizeBitmap } from "@/lib/albumArt";

export async function applyItunesMetadata(
  result: MusicResult,
  form: any,
  markDirty: (name: string, value?: any) => void,
  setPreviewArt: (url: string | null) => void,
  setIsAlbumArtLoading: (v: boolean) => void,
  pendingAlbumArtRef: React.RefObject<Uint8Array | null>,
) {
  if (result.trackName) {
    form.setValue("title", result.trackName);
    markDirty("title", result.trackName);
  }

  if (result.artistName) {
    form.setValue("artist", result.artistName);
    markDirty("artist", result.artistName);
  }

  if (result.collectionName) {
    form.setValue("album", result.collectionName);
    markDirty("album", result.collectionName);
  }

  if (result.primaryGenreName) {
    form.setValue("genre", result.primaryGenreName);
    markDirty("genre", result.primaryGenreName);
  }

  if (result.releaseDate) {
    const year = new Date(result.releaseDate).getFullYear();
    form.setValue("year", year);
    markDirty("year", year);
  }

  if (result.artworkUrl100) {
    setIsAlbumArtLoading(true);

    const bestQualityAlbumArt = result.artworkUrl100.replace(
      "100x100bb",
      "2160x2160bb",
    );

    const imageBytes = await downloadImageBytes(bestQualityAlbumArt);
    const imageBlob = new Blob([imageBytes] as BlobPart[], {
      type: "image/jpeg",
    });
    const imageBitmap = await createImageBitmap(imageBlob);

    const base64 = arrayBufferToBase64(await imageBlob.arrayBuffer());
    const resizedBlob = await resizeBitmap(imageBitmap, 128);

    form.setValue("picture", [base64]);
    setPreviewArt(URL.createObjectURL(resizedBlob));

    pendingAlbumArtRef.current = imageBytes;

    markDirty("picture", base64);
    setIsAlbumArtLoading(false);
  }
}
