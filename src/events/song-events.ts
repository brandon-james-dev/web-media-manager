import { Subject } from "rxjs";
import type { Song } from "@/models";

const songClicked$ = new Subject<Song>();
const songDoubleClicked$ = new Subject<Song>();
const songsSelected$ = new Subject<string[]>();

export { songClicked$, songDoubleClicked$, songsSelected$ };
