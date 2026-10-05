import type { IpodTrack, IpodPlaylist } from "../entities";

export interface IpodDatabase {
  tracks: IpodTrack[];
  playlists: IpodPlaylist[];
}
