import type { QueryOptions } from "@/lib/persistence/QueryOptions";
import type { Song } from "@/models/Song";
import { createContext, useContext, type Dispatch, type SetStateAction } from "react";

interface SongContextValue {
  songs: Song[];
  filteredSongs: Song[];
  filteredTotal?: number;
  query: QueryOptions<Song>;
  /** Accepts an updater so a view can change one part of the query without
   *  dropping the rest (e.g. the search filter) — see Songs/Artists. */
  setQuery: Dispatch<SetStateAction<QueryOptions<Song>>>;
  total?: number;
  page?: number;
  skip?: number;
}

export const SongContext = createContext<SongContextValue | null>(null);

export function useSongs() {
  const ctx = useContext(SongContext);
  if (!ctx) throw new Error("useSongs must be used inside SongProvider");
  return ctx;
}
