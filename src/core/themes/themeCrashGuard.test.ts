import { describe, expect, it } from "vitest";
import {
  THEME_CRASH_STORAGE_KEY,
  THEME_CRASH_WINDOW_MS,
  ThemeCrashGuard,
} from "./themeCrashGuard";
import type { ThemeCrashStorage } from "./themeCrashGuard";

function memoryStorage(): ThemeCrashStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

function guardAt(storage: ThemeCrashStorage, start = 1_000) {
  let time = start;
  const guard = new ThemeCrashGuard(storage, () => time);
  return {
    guard,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe("ThemeCrashGuard", () => {
  it("counts the first crash as recoverable", () => {
    const { guard } = guardAt(memoryStorage());
    expect(guard.recordCrash("classic-blue")).toBe(false);
  });

  it("turns the theme off on the second crash inside the window", () => {
    const { guard, advance } = guardAt(memoryStorage());
    guard.recordCrash("classic-blue");
    advance(THEME_CRASH_WINDOW_MS);
    expect(guard.recordCrash("classic-blue")).toBe(true);
  });

  it("forgets a crash that fell out of the window", () => {
    const { guard, advance } = guardAt(memoryStorage());
    guard.recordCrash("classic-blue");
    advance(THEME_CRASH_WINDOW_MS + 1);
    expect(guard.recordCrash("classic-blue")).toBe(false);
  });

  it("starts a fresh record for a different theme", () => {
    const { guard } = guardAt(memoryStorage());
    guard.recordCrash("classic-blue");
    expect(guard.recordCrash("aurora-dark")).toBe(false);
    expect(guard.recordCrash("aurora-dark")).toBe(true);
  });

  it("stores the record as one theme id and its crash times", () => {
    const storage = memoryStorage();
    const { guard } = guardAt(storage, 5_000);
    guard.recordCrash("classic-blue");
    expect(JSON.parse(storage.getItem(THEME_CRASH_STORAGE_KEY) ?? "")).toEqual({
      themeId: "classic-blue",
      times: [5_000],
    });
  });

  it("clears the record", () => {
    const storage = memoryStorage();
    const { guard } = guardAt(storage);
    guard.recordCrash("classic-blue");
    guard.clear();
    expect(storage.getItem(THEME_CRASH_STORAGE_KEY)).toBeNull();
    expect(guard.recordCrash("classic-blue")).toBe(false);
  });

  it("ignores an unreadable record", () => {
    const storage = memoryStorage();
    storage.setItem(THEME_CRASH_STORAGE_KEY, "not json");
    const { guard } = guardAt(storage);
    expect(guard.recordCrash("classic-blue")).toBe(false);
  });
});
