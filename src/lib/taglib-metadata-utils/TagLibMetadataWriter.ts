import { applyPictures, applyTags, type Picture } from "taglib-wasm";
import type { ITagData } from "@/lib/contracts";
import type { IMetadataWriter } from "@/lib/contracts/IMedataWriter";
import { resizeBitmap } from "@/lib/metadata/resizeBitmap";

export class TagLibMetadataWriter implements IMetadataWriter {
  async writeTags(file: File, tags: Partial<ITagData>): Promise<Uint8Array> {
    const taglibPictures: Picture[] = [];

    if (tags.pictures && tags.pictures.length > 0) {
      const seen = new Map<string, Picture>();

      for (const pic of tags.pictures) {
        const type =
          pic.type === "FrontCover" ? "FrontCover" : "BackCover";

        if (!seen.has(type)) {
          const sourceBlob = new Blob([pic.data.slice()], {
            type: pic.mimeType,
          });

          const bitmap = await createImageBitmap(sourceBlob);

          try {
            const resizedBlob = await resizeBitmap(bitmap, 512);

            seen.set(type, {
              mimeType: resizedBlob.type,
              data: new Uint8Array(
                await resizedBlob.arrayBuffer()
              ),
              type,
              description:
                type === "FrontCover"
                  ? "Front Cover"
                  : "Back Cover",
            });
          } finally {
            bitmap.close();
          }
        }
      }

      taglibPictures.push(...seen.values());
    }

    delete tags.pictures;

    const textUpdatedBytes = await applyTags(file, tags);

    let updatedFile = new File(
      [textUpdatedBytes.slice().buffer],
      file.name,
      {
        type: file.type,
      }
    );

    const clearedBytes = await applyPictures(updatedFile, []);

    updatedFile = new File(
      [clearedBytes.slice().buffer],
      file.name,
      {
        type: file.type,
      }
    );

    let finalBytes = clearedBytes;

    if (taglibPictures.length > 0) {
      finalBytes = await applyPictures(
        updatedFile,
        taglibPictures
      );
    }

    return finalBytes;
  }
}