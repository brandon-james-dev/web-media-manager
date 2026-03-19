import { parseBuffer } from "music-metadata";

export async function extractAlbumArtAndThumbnails(file: File) {
  const arrayBuffer = await file.arrayBuffer();

  const embedded = await getEmbeddedArtwork(arrayBuffer);

  if (!embedded) {
    return {
      original: null,
      thumb128: null,
      thumb64: null,
    };
  }

  const originalBlob = new Blob([embedded] as BlobPart[], { type: "image/jpeg" });

  const bitmap = await createImageBitmap(originalBlob);

  const thumb128 = await resizeBitmap(bitmap, 128);
  const thumb64 = await resizeBitmap(bitmap, 64);

  return {
    original: originalBlob,
    thumb128,
    thumb64,
  };
}

export async function resizeBitmap(bitmap: ImageBitmap, size: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");

  if (ctx == null)
    throw Error("Unable to initialize 2D context to resize image");

  ctx.drawImage(bitmap, 0, 0, size, size);

  return canvas.convertToBlob({
    type: "image/jpeg",
    quality: 0.85,
  });
}

async function getEmbeddedArtwork(
  buffer: ArrayBufferLike,
): Promise<Uint8Array | null> {
  const { common } = await parseBuffer(new Uint8Array(buffer));
  const { picture } = common;

  if (!picture?.at(0)?.data) return null;
  
  if (picture.at(0)?.data == undefined) return null;
  return picture.at(0)!.data;
}
