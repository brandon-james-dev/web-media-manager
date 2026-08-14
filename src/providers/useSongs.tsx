import type { Song } from "@/models/Song";
import { createContext, useContext } from "react";

interface SongContextValue {
  songs: Song[];
  refreshSongs: () => Promise<void>;
  setRootDirectory: (directoryHandle: FileSystemDirectoryHandle) => void;
}

export const SongContext = createContext<SongContextValue | null>(null);

export function useSongs() {
  const ctx = useContext(SongContext);
  if (!ctx) throw new Error("useSongs must be used inside SongProvider");
  return ctx;
}
