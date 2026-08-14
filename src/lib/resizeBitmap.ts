export async function resizeBitmap(
  bitmap: ImageBitmap,
  size: number
): Promise<Blob> {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, size, size);
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
}

export const ThumbnailSize = {
  thumb64: 64,
  thumb128: 128,
  thumb256: 256,
  thumb512: 512,
};

export type ThumbnailSize = (typeof ThumbnailSize)[keyof typeof ThumbnailSize];
