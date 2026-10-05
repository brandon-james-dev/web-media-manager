export function decodeRgb565(
  bytes: Uint8Array,
  width: number,
  height: number,
): ImageData {
  const imageData =
    new ImageData(
      width,
      height,
    );

  const output =
    imageData.data;

  for (
    let pixel = 0;
    pixel < width * height;
    pixel++
  ) {
    const sourceOffset =
      pixel * 2;

    const value =
      bytes[sourceOffset] |
      (bytes[sourceOffset + 1] << 8);

    const r5 =
      (value >> 11) & 0x1f;

    const g6 =
      (value >> 5) & 0x3f;

    const b5 =
      value & 0x1f;

    const destOffset =
      pixel * 4;

    output[destOffset] =
      (r5 * 255) / 31;

    output[destOffset + 1] =
      (g6 * 255) / 63;

    output[destOffset + 2] =
      (b5 * 255) / 31;

    output[destOffset + 3] =
      255;
  }

  return imageData;
}
