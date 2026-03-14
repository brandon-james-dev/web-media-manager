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
     * Base64-encoded album art
     */
    albumArt?: Blob | undefined;

    updatedAt?: number;

    tags?: Partial<Id3FormValues>;
} & {
    [K in keyof Id3FormValues]: string;
}
