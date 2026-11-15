import { describe, expect, it } from "vitest";
import { wmmBus } from "@/events";
import { notification$ } from "./notification-events";
import "./job-notifications";

/**
 * The generic job bridge announces every job on the bus. A device sync
 * reports its own result — with the counts it actually wrote, and only when
 * no sync surface is on screen — so the bridge must leave it alone.
 * Otherwise a finished sync raises "Device Sync completed / Finished
 * successfully" alongside the real result.
 */

function publish(state: string, jobType: string) {
  wmmBus.publish("wmm.jobs.state", {
    state,
    jobId: `job-${jobType}-${state}`,
    jobType,
    payload: {},
  } as never);
}

function collect(run: () => void) {
  const seen: { title?: string; detail?: string }[] = [];
  const subscription = notification$.subscribe((notification) => {
    seen.push(notification as never);
  });

  run();
  subscription.unsubscribe();

  return seen;
}

describe("job notifications", () => {
  it("does not announce a device sync, which reports its own result", () => {
    const seen = collect(() => publish("completed", "Device Sync"));

    expect(seen).toHaveLength(0);
  });

  it("does not announce a device sync starting", () => {
    const seen = collect(() => publish("progress", "Device Sync"));

    expect(seen).toHaveLength(0);
  });

  it("does not announce an offline download, which reports its own result", () => {
    const seen = collect(() => publish("completed", "Offline Download"));

    expect(seen).toHaveLength(0);
  });

  it("still announces other jobs", () => {
    const seen = collect(() => publish("completed", "Bulk Import"));

    expect(seen).toHaveLength(1);
    expect(seen[0]?.title).toBe("Bulk Import completed");
  });
});
