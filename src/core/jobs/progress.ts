import type { Job } from "./types";

export interface ParentProgress {
  state: string;
  completed?: number;
  total?: number;
  overall?: number;
  label?: string;
}

export interface ChildProgress {
  state: string;
  completed: number;
  remaining: number;
  total: number;
  overall: number;
}

export interface ChildAggregate {
  parent: ParentProgress;
  child: ChildProgress;
}

/** Result of completing a child job under its parent. */
export interface ChildCompletion {
  aggregate: ChildAggregate;
  /** True when this was the last child — the parent job is now finished. */
  parentDone: boolean;
}

/**
 * Aggregates parent/child job progress.
 *
 * Factored out of `BackgroundService`'s childMap/waitingParents logic so any
 * platform can use the same sub-job progress model: a parent job "completes"
 * only once its remaining child jobs all finish.
 */
export class JobProgressAggregator {
  private childMap = new Map<
    string,
    { total: number; remaining: Set<string> }
  >();
  private waitingParents = new Map<string, Job>();

  registerChild(parentId: string, childJobId: string): void {
    const entry = this.childMap.get(parentId);
    if (!entry) {
      this.childMap.set(parentId, {
        total: 1,
        remaining: new Set([childJobId]),
      });
    } else {
      entry.total++;
      entry.remaining.add(childJobId);
    }
  }

  /** Record that a parent job is waiting on its running children. */
  setWaitingParent(job: Job): void {
    this.waitingParents.set(job.id, job);
  }

  hasChildren(jobId: string): boolean {
    const entry = this.childMap.get(jobId);
    return !!entry && entry.remaining.size > 0;
  }

  /**
   * Mark a child job as complete and produce the parent's combined progress.
   * Does not mutate the waiting-parent map; the caller decides how to finish.
   */
  completeChild(
    parentId: string,
    childId: string,
    childState: string
  ): ChildCompletion {
    let entry = this.childMap.get(parentId);
    if (!entry) {
      // Completing a child under an unknown parent: register it so the
      // aggregate has a baseline.
      this.childMap.set(parentId, { total: 1, remaining: new Set([childId]) });
      entry = this.childMap.get(parentId)!;
    }
    entry.remaining.delete(childId);

    const parentJob = this.waitingParents.get(parentId);
    const childCompleted = entry.total - entry.remaining.size;
    const childOverall = entry.total === 0 ? 1 : childCompleted / entry.total;

    const aggregate: ChildAggregate = {
      parent: {
        state: parentJob?.state ?? "",
        completed: parentJob?.payload?.index,
        total: parentJob?.payload?.total,
        overall: parentJob?.payload?.overall ?? parentJob?.payload?.percent,
        label: parentJob?.payload?.label,
      },
      child: {
        state: childState,
        completed: childCompleted,
        remaining: entry.remaining.size,
        total: entry.total,
        overall: childOverall,
      },
    };

    if (entry.remaining.size === 0) {
      this.childMap.delete(parentId);
      return {
        aggregate,
        parentDone: this.waitingParents.has(parentId),
      };
    }

    return { aggregate, parentDone: false };
  }

  /** Retrieve the waiting parent job for an id (if any). */
  parentOf(parentId: string): Job | undefined {
    return this.waitingParents.get(parentId);
  }

  /** Forget a parent and its children (called when the parent finishes). */
  release(parentId: string): void {
    this.childMap.delete(parentId);
    this.waitingParents.delete(parentId);
  }
}
