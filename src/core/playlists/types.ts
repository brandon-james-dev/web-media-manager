import type { Child } from "@/core/contracts";

/**
 * Open Subsonic `PlayQueue` contract.
 */
export interface PlayQueue {
  current: number;
  position: number;
  changedBy?: string;
  changed?: string;
  entries: Child[];
}
