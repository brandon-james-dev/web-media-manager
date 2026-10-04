import type { IpodPlaylist, IpodTrack } from "..";

export interface IpodDatabase {
  tracks: IpodTrack[];
  playlists: IpodPlaylist[];
}
