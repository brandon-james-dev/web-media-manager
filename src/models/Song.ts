import type { SongTags } from "./SongTags";

export type Song = {
    /**
     * Unique identifier
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
     * The time when the song was last updated
     */
    updatedAt?: number;

    /**
     * ID3 tags extracted from the original file
     */
    tags?: Partial<SongTags>;
} & {
    [K in keyof SongTags]: string;
}
