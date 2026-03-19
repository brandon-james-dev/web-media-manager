import type { Id3FormValues } from "@/models";
import type { ICommonTagsResult } from "music-metadata";

export const TAG_MAP: Record<keyof Id3FormValues, keyof ICommonTagsResult | null> = {
  title: "title",
  artist: "artist",
  album: "album",
  albumArtist: "albumartist",
  track: null,
  disc: null,
  year: "year",
  genre: "genre",
  comment: "comment",
  composer: "composer",
  bpm: "bpm",
  lyrics: "lyrics",
  copyright: "copyright",
  encoder: "encodedby",
  picture: null
};
