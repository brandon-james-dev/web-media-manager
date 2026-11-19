import { describe, expect, it } from "vitest";
import type { InstalledTheme } from "@/core/ports";
import type { ThemeIR } from "../../ir";
import {
  isThemedLayoutPending,
  selectThemedLayout,
} from "./selectThemedLayout";

const node = { element: "Shell", attributes: {}, children: [] };

function theme(id: string, layouts: ThemeIR["layouts"]): InstalledTheme {
  return {
    id,
    name: id,
    version: "1.0.0",
    installedAt: 1,
    ir: { themeId: id, layouts } as ThemeIR,
  } as InstalledTheme;
}

describe("selectThemedLayout", () => {
  it("waits for the first load", () => {
    const snapshot = { loaded: false, theme: theme("classic-blue", {}) };
    expect(selectThemedLayout(snapshot, "desktop")).toBeUndefined();
  });

  it("returns nothing without an active theme", () => {
    const snapshot = { loaded: true, theme: undefined };
    expect(selectThemedLayout(snapshot, "desktop")).toBeUndefined();
  });

  it("returns nothing when the form factor has no layout", () => {
    const snapshot = {
      loaded: true,
      theme: theme("classic-blue", { desktop: node }),
    };
    expect(selectThemedLayout(snapshot, "mobile")).toBeUndefined();
  });

  it("returns the theme, its IR and the form factor", () => {
    const active = theme("classic-blue", { desktop: node });
    const selection = selectThemedLayout(
      { loaded: true, theme: active },
      "desktop"
    );
    expect(selection).toEqual({
      themeId: "classic-blue",
      ir: active.ir,
      formFactor: "desktop",
    });
  });
});

describe("isThemedLayoutPending", () => {
  const loading = { loaded: false, theme: undefined };

  it("holds the built-in UI while a mirrored theme with a layout loads", () => {
    expect(
      isThemedLayoutPending(loading, { layouts: ["desktop"] }, "desktop")
    ).toBe(true);
  });

  it("shows the built-in UI when no theme is mirrored", () => {
    expect(isThemedLayoutPending(loading, undefined, "desktop")).toBe(false);
  });

  it("shows the built-in UI when the mirrored theme has no layout here", () => {
    expect(
      isThemedLayoutPending(loading, { layouts: ["desktop"] }, "mobile")
    ).toBe(false);
  });

  it("treats an older mirror without layouts as having one", () => {
    expect(isThemedLayoutPending(loading, {}, "tablet")).toBe(true);
  });

  it("stops holding once the first load finishes", () => {
    expect(
      isThemedLayoutPending(
        { loaded: true, theme: undefined },
        { layouts: ["desktop"] },
        "desktop"
      )
    ).toBe(false);
  });
});
