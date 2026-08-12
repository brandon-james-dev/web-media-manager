import {
  addPicture,
  applyPictures,
  applyTags,
  type Picture,
} from "taglib-wasm";
import type { ITagData } from "@/lib/metadata-utils";
import type { IMetadataWriter } from "@/lib/metadata-utils/IMedataWriter";

export class TagLibMetadataWriter implements IMetadataWriter {
  async writeTags(file: File, tags: Partial<ITagData>): Promise<Uint8Array> {
    // Convert pictures to TagLib format
    const taglibPictures: Picture[] = [];

    if (tags.pictures && tags.pictures.length > 0) {
      const seen = new Map<string, Picture>();

      for (const pic of tags.pictures) {
        const type = pic.type === "FrontCover" ? "FrontCover" : "BackCover";

        // Only keep the first picture of each type
        if (!seen.has(type)) {
          seen.set(type, {
            mimeType: pic.mimeType,
            data: pic.data,
            type,
            description: type === "FrontCover" ? "Front Cover" : "Back Cover",
          });
        }
      }

      taglibPictures.push(...seen.values());
    }

    // Remove pictures from tagInput (applyTags cannot accept them)
    const { pictures, ...textTags } = tags;

    // Write text metadata
    const textUpdatedBytes = await applyTags(file, textTags);

    // Wrap into a new File for TagLib
    let updatedFile = new File([textUpdatedBytes.slice().buffer], file.name, {
      type: file.type,
    });

    // Remove ALL existing pictures
    const clearedBytes = await applyPictures(updatedFile, []);

    updatedFile = new File([clearedBytes.slice().buffer], file.name, {
      type: file.type,
    });

    // Add new pictures
    let finalBytes = clearedBytes;

    if (taglibPictures.length > 0) {
      finalBytes = await applyPictures(updatedFile, taglibPictures);
    }

    return finalBytes;
  }
}
