import { describe, expect, it } from "vitest";
import { derivePalette } from "./derivePalette";
import { normalizeHexColor } from "./themeIr";

const required = {
  background: "#0b1a3aff",
  foreground: "#e8eefcff",
  accent: "#3d7beaff",
  border: "#2a4a8aff",
};

describe("normalizeHexColor", () => {
  it("expands every hex form to lowercase #rrggbbaa", () => {
    expect(normalizeHexColor("#ABC")).toBe("#aabbccff");
    expect(normalizeHexColor("#0B1A3A")).toBe("#0b1a3aff");
    expect(normalizeHexColor("#3D7BEA55")).toBe("#3d7bea55");
    expect(normalizeHexColor("transparent")).toBe("#00000000");
  });
});

describe("derivePalette", () => {
  it("derives the frozen slots from the required four", () => {
    const slots = derivePalette(required);
    expect(slots.card).toBe("#142242ff");
    expect(slots.popover).toBe(slots.card);
    expect(slots.secondary).toBe("#1d2b4aff");
    expect(slots.muted).toBe("#1d2b4aff");
    expect(slots.mutedForeground).toBe("#e8eefca6");
    expect(slots.primary).toBe(required.accent);
    expect(slots.primaryForeground).toBe("#000000ff");
    expect(slots.destructive).toBe("#dc2626ff");
    expect(slots.input).toBe(required.border);
    expect(slots.ring).toBe(required.accent);
    expect(slots.selection).toBe("#3d7bea40");
    expect(slots.progressTrack).toBe(slots.muted);
    expect(slots.progressFill).toBe(required.accent);
  });

  it("keeps explicit slots", () => {
    const slots = derivePalette({
      ...required,
      card: "#12285aff",
      selection: "#3d7bea55",
    });
    expect(slots.card).toBe("#12285aff");
    expect(slots.selection).toBe("#3d7bea55");
    expect(slots.secondary).toBe("#1d2b4aff");
  });

  it("re-derives accent slots from the user accent but keeps explicit ones", () => {
    const slots = derivePalette(
      { ...required, progressFill: "#9ec3ffff" },
      "#dc2626ff"
    );
    expect(slots.accent).toBe("#dc2626ff");
    expect(slots.primary).toBe("#dc2626ff");
    expect(slots.ring).toBe("#dc2626ff");
    expect(slots.primaryForeground).toBe("#ffffffff");
    expect(slots.progressFill).toBe("#9ec3ffff");
  });
});
