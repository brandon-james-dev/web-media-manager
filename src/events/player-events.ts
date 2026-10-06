import type { Song } from "@/models";
import { Subject } from "rxjs";

export const songStartedPlayback$ = new Subject<Song>();
export const songCompletedPlayback$ = new Subject<Song>();
export const songAddedToPlaylist$ = new Subject<Song>();
export const playlistSet$ = new Subject<Song[]>();
