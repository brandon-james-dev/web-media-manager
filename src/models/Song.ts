import type { SongTags } from "./SongTags";

/**
 * Representation of an audio file with its containing id3 tags.
 */
export interface Song {
    /**
     * Unique identifier, typically the song's file name
     */
    id: string;
    
    /**
     * Duration in seconds
     */
    duration: number;

    /**
     * Average bitrate as bytes
     */
    bitrate: number;

    /**
     * A direct reference to the file
     */
    fileHandle: FileSystemFileHandle;

    /**
     * The time when the song was created
     */
    createdAt: number;

    /**
     * The time when the song was last updated
     */
    updatedAt?: number;

    /**
     * The folder this song was imported from
     */
    folderId: number;

    /**
     * ID3 tags extracted from the original file
     */
    tags?: Partial<SongTags>;
}
