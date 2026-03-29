/**
 * A background job for an album art resize task.
 */
export interface PendingArtJob {
  /**
   * A unique incrementing id
   */
  id?: number;

  /**
   * Reference to the song data that is being written to
   */
  songId: string;

  /**
   * The timestamp that the import job was created
   */
  createdAt: number;
}
