import type { Id3FormValues } from "@/models";

export interface PendingWriteJob {
  id?: number;
  songId: string;
  tags: Id3FormValues;
  createdAt: number;
}
