import type { IJobStateStore } from "@/lib/persistence/IJobStateStore";
import { DexieJobStateStore } from "@/lib/persistence/dexie/DexieJobStateStore";

export type { IJobStateStore };

let store: IJobStateStore | null = null;

export function getJobStateStore(): IJobStateStore {
  return (store ??= new DexieJobStateStore());
}

export function setJobStateStore(next: IJobStateStore): void {
  store = next;
}
