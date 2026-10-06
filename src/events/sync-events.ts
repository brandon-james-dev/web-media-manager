import { Subject } from "rxjs";
import type { Song } from "@/models";

export const queueSongs$ = new Subject<Song[]>();
export const dequeueSongs$ = new Subject<Song[]>();
