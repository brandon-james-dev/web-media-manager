import { describe, expect, it } from "vitest";
import { themeClassName } from "./styleClassNames";

describe("themeClassName", () => {
  it("is stable for the same inputs", () => {
    expect(themeClassName("classic-blue", "1.2.0", "button", "transport")).toBe(
      themeClassName("classic-blue", "1.2.0", "button", "transport")
    );
  });

  it("starts with the host prefix and is at least six characters long", () => {
    const name = themeClassName("classic-blue", "1.2.0", "button", "transport");
    expect(name.startsWith("wmm-t-")).toBe(true);
    expect(name.length).toBeGreaterThanOrEqual("wmm-t-".length + 6);
  });

  it("differs by kind for the same id", () => {
    const button = themeClassName("classic-blue", "1.2.0", "button", "nav");
    const panel = themeClassName("classic-blue", "1.2.0", "panel", "nav");
    expect(button).not.toBe(panel);
  });

  it("differs by theme version", () => {
    const first = themeClassName("classic-blue", "1.2.0", "button", "nav");
    const second = themeClassName("classic-blue", "1.3.0", "button", "nav");
    expect(first).not.toBe(second);
  });

  it("contains no author id", () => {
    const name = themeClassName("classic-blue", "1.2.0", "button", "transport");
    expect(name).not.toContain("classic-blue");
    expect(name).not.toContain("transport");
  });
});
