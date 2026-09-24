import type { Song } from "@/models";
import { Subject } from "rxjs";

const songStartedPlayback$ = new Subject<Song>();
const songCompletedPlayback$ = new Subject<Song>();
const songAddedToPlaylist = new Subject<Song>();
const playlistSet$ = new Subject<Song[]>();

export {
  songStartedPlayback$,
  songCompletedPlayback$,
  songAddedToPlaylist,
  playlistSet$,
};
