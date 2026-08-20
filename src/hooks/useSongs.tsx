import type { QueryOptions } from "@/lib/store/QueryOptions";
import type { Song } from "@/models/Song";
import { createContext, useContext } from "react";

interface SongContextValue {
  songs: Song[];
  filtered?: number;
  query: QueryOptions<Song>;
  refreshSongs: () => Promise<void>;
  setQuery: (query: QueryOptions<Song>) => void;
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
