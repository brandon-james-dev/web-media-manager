import type { Id3FormValues } from "@/models";

/**
 * A background job for a particular song that is to be imported by a worker.
 */
export interface PendingWriteJob {
  /**
   * Incrementing unique value
   */
  id?: number;

  /**
   * Reference to the song data that is being written to
   */
  songId: string;

  /**
   * The pending data that is to be written to the song
   */
  tags: Id3FormValues;

  /**
   * The timestamp of the job's creation
   */
  createdAt: number;
}
