// models/pending-write.ts
import type { Id3FormValues } from "@/models";

export interface PendingWrite {
  id?: number;              // auto-increment
  songId: string;           // references Song.id
  tags: Id3FormValues;      // the updated tag values
  createdAt: number;        // timestamp
}