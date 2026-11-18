import { describe, expect, it } from "vitest";
import { buildCommandPayload } from "./commandPayload";

describe("buildCommandPayload", () => {
  it("rejects a command that is not theme-invokable", () => {
    const result = buildCommandPayload("wmm.playback.playSong");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("wmm.playback.playSong");
  });

  it("returns no payload for a command without a parameter", () => {
    expect(buildCommandPayload("wmm.playback.playpause")).toEqual({
      ok: true,
      payload: undefined,
    });
  });

  it("puts a page id under the declared field", () => {
    expect(buildCommandPayload("wmm.ui.navigate", "library")).toEqual({
      ok: true,
      payload: { page: "library" },
    });
  });

  it("rejects a page id that is missing", () => {
    expect(buildCommandPayload("wmm.ui.navigate").ok).toBe(false);
    expect(buildCommandPayload("wmm.ui.navigate", "").ok).toBe(false);
  });

  it("puts a panel id under the declared field", () => {
    expect(buildCommandPayload("wmm.ui.togglePanel", "sidebar")).toEqual({
      ok: true,
      payload: { id: "sidebar" },
    });
  });

  it("parses a whole number inside the domain", () => {
    expect(buildCommandPayload("wmm.playback.seekBy", "-10")).toEqual({
      ok: true,
      payload: { deltaSeconds: -10 },
    });
    expect(buildCommandPayload("wmm.playback.seekBy", "300")).toEqual({
      ok: true,
      payload: { deltaSeconds: 300 },
    });
  });

  it("rejects a number outside the domain", () => {
    expect(buildCommandPayload("wmm.playback.seekBy", "301").ok).toBe(false);
    expect(buildCommandPayload("wmm.playback.seekBy", "-301").ok).toBe(false);
  });

  it("rejects zero for a non-zero parameter", () => {
    expect(buildCommandPayload("wmm.playback.seekBy", "0").ok).toBe(false);
  });

  it("rejects a value that is not a whole number", () => {
    expect(buildCommandPayload("wmm.playback.seekBy", "1.5").ok).toBe(false);
    expect(buildCommandPayload("wmm.playback.seekBy", "ten").ok).toBe(false);
    expect(buildCommandPayload("wmm.playback.seekBy").ok).toBe(false);
  });
});
