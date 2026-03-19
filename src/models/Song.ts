import type { Id3FormValues } from "./Id3FormValues";

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
    tags?: Partial<Id3FormValues>;
} & {
    [K in keyof Id3FormValues]: string;
}
