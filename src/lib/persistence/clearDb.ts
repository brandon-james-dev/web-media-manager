import { getMetadataStore } from "@/lib/persistence/initMetadataStore";
import type { CombinedMetadataStore } from "@/lib/persistence/browser/CombinedMetadataStore";

export async function clearDb(): Promise<void> {
  const store = getMetadataStore() as CombinedMetadataStore;
  await store.clearStore();
}
