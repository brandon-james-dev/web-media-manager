import type { Child } from "@/core/contracts";
import type { WorkerProgress } from "@/workers/WorkerJob";

export interface SearchResult {
  artist: { id: string; name: string }[];
  album: { id: string; name: string }[];
  song: Child[];
}

export interface SearchParams {
  query: string;
  artistCount?: number;
  albumCount?: number;
  songCount?: number;
}

export interface OnlineLookupParams {
  query: string;
  isCancelled: () => boolean;
  reportProgress: (progress: WorkerProgress) => void;
}
