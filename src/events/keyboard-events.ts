import { Subject } from "rxjs";

export const keyPressed$ = new Subject<KeyboardEvent>();
export const keyShortcut$ = new Subject<string>();
