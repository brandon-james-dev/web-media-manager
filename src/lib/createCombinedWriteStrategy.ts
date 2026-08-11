import type { Song } from "@/models/Song";
import type { IMetadataWriteStrategy, ITagData } from "./metadata-utils";

export function createCombinedWriteStrategy(
  ...strategies: IMetadataWriteStrategy[]
): IMetadataWriteStrategy {
  return {
    async write(id: string, updates: Partial<ITagData>) {
      let current: Song | null = null;

      for (const strategy of strategies) {
        const result = await strategy.write(id, current ?? updates);
        if (!result) return null;

        current = result;
      }

      return current;
    },
  };
}
