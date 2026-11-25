/**
 * The lookup lives in core (`@/core/lyrics`) so components call the public
 * API. This re-export keeps the `@/lib` barrel entry working.
 */
export { searchLyrics } from "@/core/lyrics";
