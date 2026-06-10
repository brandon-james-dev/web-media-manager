import { mediaDb } from "@/data";
import type { Id3FormValues } from "@/models";

export async function insertPendingWrite(songId: string, tags: Id3FormValues) {
  const jobId = await mediaDb.pendingWrites.add({
    songId,
    tags,
    createdAt: Date.now(),
  });
  return jobId;
}

export async function countPendingWrites() {
  return await mediaDb.pendingWrites.count();
}
