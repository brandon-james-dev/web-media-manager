export interface Song {
    /**
     * Unique identifier
     */
    id: string;
    /**
     * Song title
     */
    title: string;
    /**
     * Artist name
     */
    artist: string;
    /**
     * Album name
     */
    album: string;
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
}
