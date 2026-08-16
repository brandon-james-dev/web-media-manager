import { getMetadataStore } from "@/lib";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";

export async function clearDb(): Promise<void> {
  const store = getMetadataStore() as CombinedMetadataStore;
  await store.clearStore();
}
