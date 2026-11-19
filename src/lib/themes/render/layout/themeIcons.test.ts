import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "../../componentModel/iconNames";
import { ICON_SWAPS, resolveThemeIcon, THEME_ICONS } from "./themeIcons";

describe("THEME_ICONS", () => {
  it("maps every host icon name", () => {
    for (const name of ICON_NAMES) {
      expect(THEME_ICONS[name], name).toBeDefined();
    }
  });

  it("has no entry outside the host icon set", () => {
    expect(Object.keys(THEME_ICONS).sort()).toEqual([...ICON_NAMES].sort());
  });
});

describe("ICON_SWAPS", () => {
  it("swaps playPause, repeat, mute and fullscreen", () => {
    expect(Object.keys(ICON_SWAPS).sort()).toEqual([
      "fullscreen",
      "mute",
      "playPause",
      "repeat",
    ]);
  });
});

describe("resolveThemeIcon", () => {
  it("keeps the base face while inactive", () => {
    expect(resolveThemeIcon("playPause", { active: false })).toBe(
      THEME_ICONS.playPause
    );
  });

  it("swaps to the active face", () => {
    expect(resolveThemeIcon("playPause", { active: true })).toBe(
      ICON_SWAPS.playPause?.active
    );
    expect(resolveThemeIcon("mute", { active: true })).toBe(
      ICON_SWAPS.mute?.active
    );
  });

  it("picks the face of an active value", () => {
    expect(
      resolveThemeIcon("repeat", { active: true, activeValue: "one" })
    ).toBe(ICON_SWAPS.repeat?.activeValues?.one);
    expect(
      resolveThemeIcon("repeat", { active: true, activeValue: "all" })
    ).toBe(ICON_SWAPS.repeat?.active);
  });

  it("keeps a single-face icon", () => {
    expect(resolveThemeIcon("next", { active: true })).toBe(THEME_ICONS.next);
  });
});
