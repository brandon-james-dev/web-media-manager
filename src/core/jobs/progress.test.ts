import { describe, it, expect } from "vitest";
import { JobProgressAggregator } from "./progress";
import type { Job } from "./types";

function parentJob(id: string, index = 1, total = 3, label = "Bulk"): Job {
  return {
    id,
    type: "Bulk Edit",
    state: "running",
    payload: { index, total, overall: 0.3, label },
  };
}

describe("JobProgressAggregator", () => {
  it("aggregates child completions under a parent, parentDone only at the last", () => {
    const agg = new JobProgressAggregator();
    const parent = parentJob("p1");
    agg.setWaitingParent(parent);
    agg.registerChild("p1", "c1");
    agg.registerChild("p1", "c2");
    agg.registerChild("p1", "c3");

    const first = agg.completeChild("p1", "c1", "completed");
    expect(first.parentDone).toBe(false);
    expect(first.aggregate.child).toMatchObject({
      completed: 1,
      remaining: 2,
      total: 3,
    });
    expect(first.aggregate.parent).toMatchObject({
      state: "running",
      completed: 1,
      total: 3,
      label: "Bulk",
    });

    const mid = agg.completeChild("p1", "c2", "completed");
    expect(mid.parentDone).toBe(false);
    expect(mid.aggregate.child.remaining).toBe(1);

    const last = agg.completeChild("p1", "c3", "completed");
    expect(last.parentDone).toBe(true);
    expect(last.aggregate.child).toMatchObject({ completed: 3, remaining: 0 });
  });

  it("reports parentDone=false when the parent was never set as waiting", () => {
    const agg = new JobProgressAggregator();
    agg.registerChild("orphan", "c1");
    const res = agg.completeChild("orphan", "c1", "completed");
    expect(res.parentDone).toBe(false);
    expect(res.aggregate.child).toMatchObject({ completed: 1, remaining: 0 });
  });

  it("hasChildren reflects outstanding children", () => {
    const agg = new JobProgressAggregator();
    agg.registerChild("p2", "c1");
    agg.registerChild("p2", "c2");
    expect(agg.hasChildren("p2")).toBe(true);
    agg.completeChild("p2", "c1", "completed");
    expect(agg.hasChildren("p2")).toBe(true);
    agg.completeChild("p2", "c2", "completed");
    expect(agg.hasChildren("p2")).toBe(false);
  });

  it("release forgets the parent and its children", () => {
    const agg = new JobProgressAggregator();
    agg.setWaitingParent(parentJob("p3"));
    agg.registerChild("p3", "c1");
    agg.release("p3");
    expect(agg.parentOf("p3")).toBeUndefined();
    expect(agg.hasChildren("p3")).toBe(false);

    const res = agg.completeChild("p3", "c1", "completed");
    expect(res.parentDone).toBe(false);
  });

  it("child with unknown parent registers it and completes (baseline)", () => {
    const agg = new JobProgressAggregator();
    const res = agg.completeChild("ghost", "child-1", "completed");
    expect(res.aggregate.child).toMatchObject({
      completed: 1,
      remaining: 0,
      total: 1,
    });
    expect(res.parentDone).toBe(false);
  });
});
