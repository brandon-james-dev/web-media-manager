import type { MusicResult } from "itunes-web-api";
import { extractItunesMetadata } from "./extractItunesMetadata";
import { resizeBitmap } from "@/lib/albumArt";
import { base64ToArrayBuffer } from "@/lib/utils";

export async function applyItunesMetadata(
  result: MusicResult,
  form: any,
  markDirty: (name: string, value?: any) => void,
  setPreviewArt: (url: string | null) => void,
  setIsAlbumArtLoading: (v: boolean) => void,
) {
  const meta = await extractItunesMetadata(result);

  if (meta.title) {
    form.setValue("title", meta.title);
    markDirty("title", meta.title);
  }

  if (meta.artist) {
    form.setValue("artist", meta.artist);
    markDirty("artist", meta.artist);
  }

  if (meta.album) {
    form.setValue("album", meta.album);
    markDirty("album", meta.album);
  }

  if (meta.genre) {
    form.setValue("genre", meta.genre);
    markDirty("genre", meta.genre);
  }

  if (meta.year) {
    form.setValue("year", meta.year);
    markDirty("year", meta.year);
  }

  if (meta.track) {
    form.setValue("track", meta.track);
    markDirty("track", meta.track);
  }

  if (meta.disc) {
    form.setValue("disc", meta.disc);
    markDirty("disc", meta.disc);
  }

  if (meta.picture) {
    setIsAlbumArtLoading(true);

    const base64 = meta.picture.at(0);
    if (!base64) return;
    const imageBytes = new Uint8Array(base64ToArrayBuffer(base64));
    const imageBlob = new Blob([imageBytes] as BlobPart[], {
      type: "image/jpeg",
    });
    const imageBitmap = await createImageBitmap(imageBlob);
    const resizedBlob = await resizeBitmap(imageBitmap, 128);

    form.setValue("picture", [base64]);
    setPreviewArt(URL.createObjectURL(resizedBlob));

    markDirty("picture", base64);
    setIsAlbumArtLoading(false);
  }
}
