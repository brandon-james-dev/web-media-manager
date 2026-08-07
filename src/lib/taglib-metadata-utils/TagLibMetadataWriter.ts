import { applyTags } from "taglib-wasm";
import type { ITagData } from "@/lib/metadata-utils";
import type { IMetadataWriter } from "@/lib/metadata-utils/IMedataWriter";

export class TagLibMetadataWriter implements IMetadataWriter {
  async writeTags(file: File, tags: Partial<ITagData>): Promise<Uint8Array> {
    const updatedBytes = await applyTags(file, tags);
    return updatedBytes;
  }
}
