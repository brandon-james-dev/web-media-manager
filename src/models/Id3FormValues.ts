import type { SongTags } from "./SongTags";

export interface Id3FormValues extends SongTags {
    picture?: string[] | undefined;
};
