import type {
  IpodDatabase,
  IpodTrack,
} from "../../models";

export function addTrackToDatabase(
  db: IpodDatabase,
  track: IpodTrack,
): IpodTrack {
  const nextTrackId =
    Math.max(
      0,
      ...db.tracks.map(
        (track) => track.id ?? 0,
      ),
    ) + 1;

  const createdTrack = {
    ...track,
    id: nextTrackId,
  };

  db.tracks.push(
    createdTrack,
  );

  const masterPlaylist =
    db.playlists.find(
      (playlist) =>
        playlist.type === "master",
    );

  if (masterPlaylist) {
    masterPlaylist.tracks.push(
      createdTrack,
    );
  }

  return createdTrack;
}
