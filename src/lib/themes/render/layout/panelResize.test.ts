import { describe, expect, it } from "vitest";
import type { IRNode, IRValue } from "../../ir";
import {
  clampPanelWidth,
  PANEL_MAX_WIDTH,
  PANEL_MIN_WIDTH,
  PANEL_RESIZE_STEP,
  panelResizeStep,
  panelWidthBounds,
  panelWidthKey,
} from "./panelResize";

function node(attributes: Record<string, IRValue> = {}): IRNode {
  return { element: "Panel", attributes, children: [] };
}

describe("panelWidthBounds", () => {
  it("falls back to the default range", () => {
    expect(panelWidthBounds(node())).toEqual({
      min: PANEL_MIN_WIDTH,
      max: PANEL_MAX_WIDTH,
    });
  });

  it("reads the panel's own minWidth and maxWidth", () => {
    expect(panelWidthBounds(node({ minWidth: 140, maxWidth: 420 }))).toEqual({
      min: 140,
      max: 420,
    });
  });

  it("keeps a single declared bound and defaults the other", () => {
    expect(panelWidthBounds(node({ minWidth: 300 }))).toEqual({
      min: 300,
      max: PANEL_MAX_WIDTH,
    });
    expect(panelWidthBounds(node({ maxWidth: 90 }))).toEqual({
      min: PANEL_MIN_WIDTH,
      max: PANEL_MIN_WIDTH,
    });
  });
});

describe("clampPanelWidth", () => {
  const bounds = { min: 140, max: 420 };

  it("holds a width inside the bounds", () => {
    expect(clampPanelWidth(260, bounds)).toBe(260);
  });

  it("stops at either edge", () => {
    expect(clampPanelWidth(40, bounds)).toBe(140);
    expect(clampPanelWidth(900, bounds)).toBe(420);
  });

  it("rounds a fractional drag", () => {
    expect(clampPanelWidth(260.6, bounds)).toBe(261);
  });
});

describe("panelWidthKey", () => {
  it("keys the width by theme, form factor and panel id", () => {
    expect(panelWidthKey("glass-player", "desktop", "library-nav")).toBe(
      "wmm.theme.panel.glass-player.desktop.library-nav"
    );
  });
});

describe("panelResizeStep", () => {
  it("grows a start panel to the right", () => {
    expect(panelResizeStep("start", "ArrowRight")).toBe(PANEL_RESIZE_STEP);
    expect(panelResizeStep("start", "ArrowLeft")).toBe(-PANEL_RESIZE_STEP);
  });

  it("grows an end panel to the left", () => {
    expect(panelResizeStep("end", "ArrowLeft")).toBe(PANEL_RESIZE_STEP);
    expect(panelResizeStep("end", "ArrowRight")).toBe(-PANEL_RESIZE_STEP);
  });
});
