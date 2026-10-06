import { Subject } from "rxjs";
import type { Song } from "@/models";

export const songClicked$ = new Subject<Song>();
export const songDoubleClicked$ = new Subject<Song>();
export const songsSelected$ = new Subject<string[]>();
export const playSong$ = new Subject<Song>();
export const pausePlayback$ = new Subject<boolean>();
export const addSongToPlaylist$ = new Subject<Song>();
export const quickEditSongs$ = new Subject<Song[]>();
export const advancedEditSong$ = new Subject<Song>();
