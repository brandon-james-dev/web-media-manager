import type { Song } from "@/models";
import { Subject } from "rxjs";

export const songEditSaved$ = new Subject<Song>();
export const isEditMultipleChanged$ = new Subject<boolean>();
export const editorModeChanged$ = new Subject<"song" | "edit">();
