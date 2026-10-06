import type { IpodTrack } from ".";

export interface PlaylistColumn {
  fieldId: number;
  value: number;
}

export interface IpodPlaylist {
  id: number;
  name?: string;
  type: PlaylistType;
  tracks: IpodTrack[];
  columns: PlaylistColumn[];
}

export type PlaylistType = "master" | "normal" | "system" | "unknown";

export function getPlaylistType(sectionType: number): PlaylistType {
  switch (sectionType) {
    case 3:
      return "master";

    case 2:
      return "normal";

    case 5:
      return "system";

    default:
      return "unknown";
  }
}
