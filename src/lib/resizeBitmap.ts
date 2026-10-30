export async function resizeBitmap(
  bitmap: ImageBitmap,
  size: ThumbnailSize
): Promise<Blob> {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(bitmap, 0, 0, size, size);

  const type = "image/webp";
  const quality = qualityBySize[size];
  try {
    return await canvas.convertToBlob({
      type,
      quality
    });
  } catch {
    return await canvas.convertToBlob({
      type: "image/jpeg",
      quality
    });
  }
}

export const ThumbnailSize = {
  thumb64: 64,
  thumb128: 128,
  thumb256: 256,
  thumb512: 512,
};

const qualityBySize: Record<ThumbnailSize, number> = {
  [ThumbnailSize.thumb64]: 0.7,
  [ThumbnailSize.thumb128]: 0.75,
  [ThumbnailSize.thumb256]: 0.8,
  [ThumbnailSize.thumb512]: 0.85,
};

export type ThumbnailSize = (typeof ThumbnailSize)[keyof typeof ThumbnailSize];
