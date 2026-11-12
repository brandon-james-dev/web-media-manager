import {
  readTags as taglibReadTags,
  readProperties as taglibReadProps,
  readMetadata as taglibReadMetadata,
  isValidAudioFile,
  type ExtendedTag,
  type AudioProperties,
} from "taglib-wasm/simple";

import type {
  IMetadataReader,
  ITagData,
  IAudioProperties,
  IMetadata,
} from "@/lib/contracts";
import { mapProperties, mapTags } from "./mapTaglib";

export class TagLibMetadataReader implements IMetadataReader {
  async validate(file: File): Promise<boolean> {
    try {
      return await isValidAudioFile(file);
    } catch {
      return false;
    }
  }

  async readTags(file: File): Promise<ITagData | null> {
    try {
      const tags: ExtendedTag = await taglibReadTags(file);

      return mapTags(tags, file.name);
    } catch {
      return null;
    }
  }

  async readProperties(file: File): Promise<IAudioProperties | null> {
    try {
      const props: AudioProperties = await taglibReadProps(file);

      return mapProperties(props);
    } catch {
      return null;
    }
  }

  async readMetadata(file: File): Promise<IMetadata | null> {
    try {
      const { tags, properties } = await taglibReadMetadata(file);

      return {
        ...mapTags(tags, file.name),
        ...(properties ? mapProperties(properties) : {}),
      };
    } catch {
      return null;
    }
  }
}
