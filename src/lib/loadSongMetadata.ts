import type { Song } from "@/models/Song";
import { getMetadataStore } from "./initMetadataStore";

export async function loadSongMetadata(id: string): Promise<Song | null> {
  const store = getMetadataStore();

  return await store.getSong(id);
}
