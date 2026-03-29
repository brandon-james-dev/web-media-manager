/**
 * The filesystem folder that was chosen by the user
 */
export interface Folder {
  /**
   * A unique incrementing id
   */
  id?: number;

  /**
   * The name of the directory
   */
  directoryName: string;

  /**
   * A direct reference to the directory
   */
  directoryHandle: FileSystemDirectoryHandle;

  /**
   * The timestamp that the folder was chosen
   */
  createdAt: number;
}
