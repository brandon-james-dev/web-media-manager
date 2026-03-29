/**
 * Select id3 tags that are used in displaying track information in the interface
 */
export interface SongTags {
    /**
     * Song title
     */
    title?: string;
    
    /**
     * The author of the song
     */
    artist?: string;

    /**
     * The album the song is collected in
     */
    album?: string;

    /**
     * The attributed artist of the produced album
     */
    albumArtist?: string;

    /**
     * The number (X/Y) track in the song's album track set
     */
    track?: string;

    /**
     * The number (X/Y) disc in the album set
     */
    disc?: string;

    /**
     * The year the song was produced
     */
    year?: number;

    /**
     * The music category for this song
     */
    genre?: string;

    /**
     * Any notes written about this song
     */
    comment?: string;

    /**
     * Specifically who wrote the music if it was played by another artist
     */
    composer?: string;

    /**
     * The pace of the music
     */
    bpm?: number;

    /**
     * The static text for the lyrics of the song
     */
    lyrics?: string;

    /**
     * Year the song was copyrighted
     */
    copyright?: string;

    /**
     * The audio encoding method for the song
     */
    encoder?: string;
};
