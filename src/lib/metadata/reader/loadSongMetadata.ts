import type { Song } from "@/models/Song";
import { getMetadataStore } from "../../persistence/initMetadataStore";

export async function loadSongMetadata(id: string): Promise<Song | null> {
  const store = getMetadataStore();

  return await store.get(id);
}
