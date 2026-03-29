import type { SongTags } from "./SongTags";

/**
 * This is used in a form to update new song information. It has the picture property
 * because the thumbnails have their own table and it doesn't make sense to include it
 * in the song tags themselves so the album art isn't saving in two places.
 */
export interface Id3FormValues extends SongTags {
    picture?: string[] | undefined;
};
