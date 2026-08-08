import { applyPictures, applyTags, type Picture } from "taglib-wasm";
import type { ITagData } from "@/lib/metadata-utils";
import type { IMetadataWriter } from "@/lib/metadata-utils/IMedataWriter";

export class TagLibMetadataWriter implements IMetadataWriter {
  async writeTags(file: File, tags: Partial<ITagData>): Promise<Uint8Array> {
    // Extract TagLib pictures
    const taglibPictures: Picture[] = [];

    if (tags.pictures && tags.pictures.length > 0) {
      for (const pic of tags.pictures) {
        taglibPictures.push({
          mimeType: pic.mimeType,
          data: pic.data,
          type: pic.type == "FrontCover" ? "FrontCover" : "BackCover",
          description: pic.type === "FrontCover" ? "Front Cover" : "Back Cover",
        });
      }
    }

    // Remove pictures from tagInput (applyTags cannot accept them)
    const { pictures, ...textTags } = tags;

    // 1. First pass: write text metadata
    const textUpdatedBytes = await applyTags(file, textTags);

    // Wrap updated bytes into a new File for TagLib
    let updatedFile = new File([textUpdatedBytes.slice().buffer], file.name, {
      type: file.type,
    });

    // 2. Second pass: embed pictures
    let finalBytes = textUpdatedBytes;

    if (taglibPictures.length > 0) {
      finalBytes = await applyPictures(updatedFile, taglibPictures);

      // Wrap again for consistency (TagLib expects a File)
      updatedFile = new File([finalBytes.slice().buffer], file.name, {
        type: file.type,
      });
    }

    return finalBytes;
  }
}
