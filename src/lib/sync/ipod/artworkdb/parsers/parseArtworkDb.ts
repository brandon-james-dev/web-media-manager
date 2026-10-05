import type {
  IpodArtworkDatabase,
  IpodArtworkFormat,
} from "../../models/entities";
import { ARTWORK_FORMATS } from "../constants";

export async function parseArtworkDb(
  root: FileSystemDirectoryHandle
): Promise<IpodArtworkDatabase> {
  const ipodControl = await root.getDirectoryHandle("iPod_Control");
  const artworkDir = await ipodControl.getDirectoryHandle("Artwork");
  const fileSizes = new Map<string, number>();

  for await (const [name, handle] of artworkDir.entries()) {
    if (handle.kind !== "file" || !name.endsWith(".ithmb")) {
      continue;
    }

    const file = await handle.getFile();

    fileSizes.set(name, file.size);
  }

  const formats: IpodArtworkFormat[] = Object.entries(ARTWORK_FORMATS).map(
    ([formatId, format]) => ({
      formatId: Number(formatId),

      fileName: `F${formatId}_1.ithmb`,
      width: format.width,
      height: format.height,
      imageSize: format.bytesPerImage,
    })
  );

  return {
    artworks: [
      {
        id: "default",
        formats,
      },
    ],

    formats,
  };
}
