export interface AlbumListParams {
  type:
    | "newest"
    | "recent"
    | "frequent"
    | "random"
    | "alphabeticalByArtist"
    | "alphabeticalByName"
    | "byGenre"
    | "byYear";
  size?: number;
  offset?: number;
  fromYear?: number;
  toYear?: number;
  genre?: string;
}
