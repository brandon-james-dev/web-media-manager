import type { Song } from "@/models";
import { Subject } from "rxjs";

const songEditSaved$ = new Subject<Song>();
const isEditMultipleChanged$ = new Subject<boolean>();
const editorModeChanged$ = new Subject<"song" | "edit">();

export { songEditSaved$, isEditMultipleChanged$, editorModeChanged$ };
