import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import type { IRNode, ThemeIR } from "../../ir";
import { validateThemePackage } from "../../pipeline";
import { classicBlueDesktop } from "../../testing/classicBlueDesktop";
import { classicBlueTheme } from "../../testing/classicBlueTheme";
import { analyzeLayout } from "./layoutAnalysis";
import { planDock } from "./planDock";

const manifest = {
  kind: "theme",
  spec: "1.0",
  id: "classic-blue",
  name: "Classic Blue",
  version: "1.2.0",
  formFactors: ["desktop"],
  colorSchemes: ["dark"],
};

function classicBlueLayout(): IRNode {
  const input = zipSync({
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "theme.xml": strToU8(classicBlueTheme),
    "layouts/desktop.xml": strToU8(classicBlueDesktop),
  });
  const result = validateThemePackage(input);
  expect(result.issues.filter((issue) => issue.severity === "error")).toEqual(
    []
  );
  const layout = (result.ir as ThemeIR).layouts.desktop;
  expect(layout).toBeDefined();
  return layout as IRNode;
}

describe("classic blue desktop layout", () => {
  it("finds the four pages with now-playing as the default", () => {
    const analysis = analyzeLayout(classicBlueLayout());
    expect(analysis.pages.map((page) => page.id)).toEqual([
      "now-playing",
      "library",
      "playlists",
      "sync",
    ]);
    expect(analysis.defaultPageId).toBe("now-playing");
    expect(analysis.pages.map((page) => page.role)).toEqual([
      "nowPlaying",
      "library",
      "playlists",
      "sync",
    ]);
  });

  it("renders now-playing in the page host, not as an overlay", () => {
    const analysis = analyzeLayout(classicBlueLayout());
    const nowPlaying = analysis.pages[0];
    expect(nowPlaying.overlay).toBe(false);
    expect(nowPlaying.openOnPlay).toBe(false);
  });

  it("finds the settings button and the page host", () => {
    const analysis = analyzeLayout(classicBlueLayout());
    expect(analysis.hasSettingsButton).toBe(true);
    expect(analysis.hasPageHost).toBe(true);
  });

  it("docks the shell to top, bottom, start and fill", () => {
    const analysis = analyzeLayout(classicBlueLayout());
    const chrome = analysis.shell.children[0];
    expect(chrome.element).toBe("Panel");
    const dockPanel = chrome.children[0];
    expect(dockPanel.element).toBe("DockPanel");
    expect(planDock(dockPanel.children).map((slot) => slot.edge)).toEqual([
      "top",
      "bottom",
      "start",
      "fill",
    ]);
  });
});
