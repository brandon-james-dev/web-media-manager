import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PersistedJob } from "@/core/jobs";

const alive = new Set<string>();
vi.mock("./tabSession", () => ({
  tabId: "me",
  holdTabLock: () => {},
  isTabAlive: async (id: string) => id === "me" || alive.has(id),
}));

const { setJobStateStore } = await import("./jobStateStore");
const {
  persistJob,
  recordCompletion,
  lastCompletedAt,
  checkpointJob,
  forgetJob,
  sanitizePayload,
  takeInterruptedJobs,
} = await import("./jobPersistence");

function memoryStore(seed: PersistedJob[] = []) {
  const rows = new Map(seed.map((j) => [j.id, j]));
  setJobStateStore({
    put: async (j) => void rows.set(j.id, j),
    patch: async (id, c) => {
      const r = rows.get(id);
      if (r) rows.set(id, { ...r, ...c });
    },
    remove: async (id) => void rows.delete(id),
    list: async () => [...rows.values()],
    claim: async (id, expected, next) => {
      const r = rows.get(id);
      if (!r || r.ownerId !== expected) return false;
      rows.set(id, { ...r, ownerId: next });
      return true;
    },
  });
  return rows;
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const job = (id: string, ownerId: string): PersistedJob => ({
  id,
  type: "Bulk Edit",
  payload: {},
  ownerId,
  createdAt: 0,
  updatedAt: 0,
});

describe("job persistence", () => {
  beforeEach(() => alive.clear());

  it("never stores the resolved source credential", () => {
    expect(
      sanitizePayload({
        musicSource: { id: "a" },
        musicSourceConfig: { secret: "x" },
      })
    ).toEqual({ musicSource: { id: "a" } });
  });

  it("saves a job on enqueue and drops it when finished", async () => {
    const rows = memoryStore();
    persistJob({
      id: "j1",
      type: "Bulk Edit",
      state: "pending",
      payload: { songIds: ["a"], musicSourceConfig: { secret: "x" } },
    });
    await flush();
    expect(rows.get("j1")?.payload).toEqual({ songIds: ["a"] });
    expect(rows.get("j1")?.ownerId).toBe("me");

    forgetJob("j1");
    await flush();
    expect(rows.has("j1")).toBe(false);
  });

  it("throttles checkpoint writes and keeps the latest", async () => {
    vi.useFakeTimers();
    const rows = memoryStore();
    persistJob({ id: "j2", type: "Bulk Edit", state: "pending", payload: {} });
    await vi.advanceTimersByTimeAsync(0);
    checkpointJob("j2", { done: 1 });
    checkpointJob("j2", { done: 5 });
    expect(rows.get("j2")?.checkpoint).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1100);
    expect(rows.get("j2")?.checkpoint).toEqual({ done: 5 });
    vi.useRealTimers();
  });

  it("restores only jobs whose owning tab is gone, once", async () => {
    alive.add("open-tab");
    const rows = memoryStore([
      job("orphan", "closed-tab"),
      job("busy", "open-tab"),
    ]);
    const taken = await takeInterruptedJobs();
    expect(taken.map((j) => j.id)).toEqual(["orphan"]);
    expect(rows.get("orphan")?.ownerId).toBe("me");
    expect(rows.get("busy")?.ownerId).toBe("open-tab");
    expect(await takeInterruptedJobs()).toEqual([]);
  });

  it("reports the last completion only for the same fingerprint", async () => {
    memoryStore();
    expect(await lastCompletedAt("Bulk Import", "s", "a")).toBeUndefined();

    recordCompletion("Bulk Import", "s", "a");
    await flush();

    expect(await lastCompletedAt("Bulk Import", "s", "a")).toBeTypeOf("number");
    expect(await lastCompletedAt("Bulk Import", "s", "b")).toBeUndefined();
  });

  it("never restores a completion record", async () => {
    memoryStore();
    recordCompletion("Bulk Import", "s", "a");
    await flush();

    expect(await takeInterruptedJobs()).toEqual([]);
  });
});
