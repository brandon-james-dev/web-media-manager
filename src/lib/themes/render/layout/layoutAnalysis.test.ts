import { describe, expect, it } from "vitest";
import type { IRNode, IRValue } from "../../ir";
import { analyzeLayout } from "./layoutAnalysis";

function node(
  element: string,
  attributes: Record<string, IRValue> = {},
  children: IRNode[] = []
): IRNode {
  return { element, attributes, children };
}

function layout(children: IRNode[]): IRNode {
  return node("Layout", { spec: "1.0", formFactor: "desktop" }, children);
}

const settingsButton = node("Button", {
  command: "wmm.ui.openSettings",
  labelKey: "settings.title",
});

describe("analyzeLayout", () => {
  it("reads the shell, the pages and the default page", () => {
    const analysis = analyzeLayout(
      layout([
        node("Shell", {}, [node("PageHost")]),
        node("Page", {
          id: "library",
          role: "library",
          titleKey: "navigation.library",
          default: true,
        }),
        node("Page", {
          id: "sync",
          role: "sync",
          titleKey: "navigation.sync",
        }),
      ])
    );

    expect(analysis.shell.element).toBe("Shell");
    expect(analysis.pages.map((page) => page.id)).toEqual(["library", "sync"]);
    expect(analysis.pages[0].role).toBe("library");
    expect(analysis.pages[0].titleKey).toBe("navigation.library");
    expect(analysis.defaultPageId).toBe("library");
    expect(analysis.hasPageHost).toBe(true);
  });

  it("uses the first page when none is marked default", () => {
    const analysis = analyzeLayout(
      layout([
        node("Shell", {}, [node("PageHost")]),
        node("Page", { id: "playlists", titleKey: "navigation.playlists" }),
        node("Page", { id: "sync", titleKey: "navigation.sync" }),
      ])
    );
    expect(analysis.defaultPageId).toBe("playlists");
  });

  it("reads the overlay presentation and openOnPlay", () => {
    const analysis = analyzeLayout(
      layout([
        node("Shell", {}, [node("PageHost")]),
        node("Page", {
          id: "now-playing",
          role: "nowPlaying",
          titleKey: "navigation.nowPlaying",
          presentation: "overlay",
          openOnPlay: true,
        }),
      ])
    );
    expect(analysis.pages[0].overlay).toBe(true);
    expect(analysis.pages[0].openOnPlay).toBe(true);
  });

  it("defaults a page to the page presentation", () => {
    const analysis = analyzeLayout(
      layout([
        node("Shell", {}, [node("PageHost")]),
        node("Page", { id: "library", titleKey: "navigation.library" }),
      ])
    );
    expect(analysis.pages[0].overlay).toBe(false);
    expect(analysis.pages[0].openOnPlay).toBe(false);
  });

  it("collects collapsible panel ids from the shell and the pages", () => {
    const analysis = analyzeLayout(
      layout([
        node("Shell", {}, [
          node("Panel", { id: "sidebar", collapsible: true }, [
            node("TrackList"),
          ]),
          node("PageHost"),
        ]),
        node("Page", { id: "library", titleKey: "navigation.library" }, [
          node("Panel", { id: "editor", collapsible: true }),
        ]),
      ])
    );
    expect(analysis.collapsiblePanelIds).toEqual(["sidebar", "editor"]);
  });

  it("finds a settings button in the shell", () => {
    const analysis = analyzeLayout(
      layout([node("Shell", {}, [node("Stack", {}, [settingsButton])])])
    );
    expect(analysis.hasSettingsButton).toBe(true);
    expect(analysis.hasPageHost).toBe(false);
  });

  it("reports no settings button when the layout has none", () => {
    const analysis = analyzeLayout(
      layout([
        node("Shell", {}, [
          node(
            "Button",
            { command: "wmm.playback.next", labelKey: "playback.next" },
            []
          ),
        ]),
      ])
    );
    expect(analysis.hasSettingsButton).toBe(false);
  });

  it("treats a layout without pages as a shell-only layout", () => {
    const analysis = analyzeLayout(layout([node("Shell", {}, [node("Grid")])]));
    expect(analysis.pages).toEqual([]);
    expect(analysis.defaultPageId).toBeUndefined();
  });
});
