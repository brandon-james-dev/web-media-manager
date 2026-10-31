import { describe, it, expect } from "vitest";
import {
  WMM_COMMANDS,
  WMM_EVENTS,
  WMM_COMMAND_NAMES,
  WMM_EVENT_NAMES,
  isWmmCommand,
  isWmmEvent,
} from "./taxonomy";

describe("taxonomy", () => {
  it("derives the command name list exactly from the command record", () => {
    expect(WMM_COMMAND_NAMES).toEqual(Object.keys(WMM_COMMANDS));
    expect(WMM_COMMAND_NAMES.length).toBeGreaterThan(0);
  });

  it("derives the event name list exactly from the event record", () => {
    expect(WMM_EVENT_NAMES).toEqual(Object.keys(WMM_EVENTS));
    expect(WMM_EVENT_NAMES.length).toBeGreaterThan(0);
  });

  it("keeps command and event namespaces disjoint", () => {
    const overlap = WMM_COMMAND_NAMES.filter((n) =>
      (WMM_EVENT_NAMES as string[]).includes(n)
    );
    expect(overlap).toEqual([]);
  });

  it("accepts every name in the records as valid", () => {
    for (const name of WMM_COMMAND_NAMES) {
      expect(isWmmCommand(name)).toBe(true);
      expect(isWmmEvent(name)).toBe(false);
    }
    for (const name of WMM_EVENT_NAMES) {
      expect(isWmmEvent(name)).toBe(true);
      expect(isWmmCommand(name)).toBe(false);
    }
  });

  it("rejects unknown and malformed names", () => {
    expect(isWmmCommand("wmm.bogus.action")).toBe(false);
    expect(isWmmEvent("wmm.bogus.action")).toBe(false);
    expect(isWmmCommand("")).toBe(false);
    expect(isWmmEvent("playback.paused")).toBe(false);
  });

  it("every command name follows the wmm.<domain>.<action> scheme", () => {
    const scheme = /^wmm\.[a-z.]+\.\w+$/;
    for (const name of WMM_COMMAND_NAMES) {
      expect(name).toMatch(scheme);
    }
    for (const name of WMM_EVENT_NAMES) {
      expect(name).toMatch(scheme);
    }
  });
});
