import { describe, expect, it } from "vitest";
import type { ButtonStateSnapshot } from "./buttonState";
import { computeButtonState, isToggleCommand } from "./buttonState";

function snapshot(
  overrides: Partial<ButtonStateSnapshot> = {}
): ButtonStateSnapshot {
  return {
    isPlaying: false,
    shuffle: "off",
    repeat: "off",
    muted: false,
    queuedCount: 0,
    syncing: false,
    nowPlayingOpen: false,
    nowPlayingPage: false,
    fullscreen: false,
    darkRoom: false,
    currentPage: "library",
    openPanels: new Set<string>(),
    editMode: false,
    ...overrides,
  };
}

describe("computeButtonState", () => {
  it("marks playpause active while playing", () => {
    expect(
      computeButtonState("wmm.playback.playpause", undefined, snapshot()).active
    ).toBe(false);
    expect(
      computeButtonState(
        "wmm.playback.playpause",
        undefined,
        snapshot({ isPlaying: true })
      ).active
    ).toBe(true);
  });

  it("marks shuffle active with the on value", () => {
    expect(
      computeButtonState(
        "wmm.playback.toggleShuffle",
        undefined,
        snapshot({ shuffle: "on" })
      )
    ).toEqual({
      active: true,
      activeValue: "on",
      selected: false,
      disabled: false,
    });
    expect(
      computeButtonState("wmm.playback.toggleShuffle", undefined, snapshot())
        .active
    ).toBe(false);
  });

  it("marks repeat active with the all and one values", () => {
    expect(
      computeButtonState(
        "wmm.playback.toggleRepeat",
        undefined,
        snapshot({ repeat: "all" })
      ).activeValue
    ).toBe("all");
    expect(
      computeButtonState(
        "wmm.playback.toggleRepeat",
        undefined,
        snapshot({ repeat: "one" })
      ).activeValue
    ).toBe("one");
    expect(
      computeButtonState("wmm.playback.toggleRepeat", undefined, snapshot())
        .active
    ).toBe(false);
  });

  it("marks mute active while muted", () => {
    expect(
      computeButtonState(
        "wmm.playback.toggleMute",
        undefined,
        snapshot({ muted: true })
      ).active
    ).toBe(true);
  });

  it("selects the navigate button of the current page", () => {
    expect(
      computeButtonState(
        "wmm.ui.navigate",
        "library",
        snapshot({ currentPage: "library" })
      ).selected
    ).toBe(true);
    expect(
      computeButtonState(
        "wmm.ui.navigate",
        "sync",
        snapshot({ currentPage: "library" })
      ).selected
    ).toBe(false);
  });

  it("badges the sync navigate button with the queue size", () => {
    expect(
      computeButtonState(
        "wmm.ui.navigate",
        "sync",
        snapshot({ queuedCount: 3 })
      ).badge
    ).toBe(3);
    expect(
      computeButtonState(
        "wmm.ui.navigate",
        "sync",
        snapshot({ queuedCount: 0 })
      ).badge
    ).toBeUndefined();
    expect(
      computeButtonState(
        "wmm.ui.navigate",
        "library",
        snapshot({ queuedCount: 3 })
      ).badge
    ).toBeUndefined();
  });

  it("marks togglePanel active while the panel is open", () => {
    expect(
      computeButtonState(
        "wmm.ui.togglePanel",
        "sidebar",
        snapshot({ openPanels: new Set(["sidebar"]) })
      ).active
    ).toBe(true);
    expect(
      computeButtonState(
        "wmm.ui.togglePanel",
        "sidebar",
        snapshot({ openPanels: new Set(["editor"]) })
      ).active
    ).toBe(false);
  });

  it("marks fullscreen, dark room and edit mode active", () => {
    expect(
      computeButtonState(
        "wmm.ui.toggleFullscreen",
        undefined,
        snapshot({ fullscreen: true })
      ).active
    ).toBe(true);
    expect(
      computeButtonState(
        "wmm.ui.toggleDarkRoom",
        undefined,
        snapshot({ darkRoom: true })
      ).active
    ).toBe(true);
    expect(
      computeButtonState(
        "wmm.ui.toggleEditMode",
        undefined,
        snapshot({ editMode: true })
      ).active
    ).toBe(true);
  });

  it("disables toggleFullscreen off the Now Playing page", () => {
    expect(
      computeButtonState(
        "wmm.ui.toggleFullscreen",
        undefined,
        snapshot({ nowPlayingPage: false })
      ).disabled
    ).toBe(true);
    expect(
      computeButtonState(
        "wmm.ui.toggleFullscreen",
        undefined,
        snapshot({ nowPlayingPage: true })
      ).disabled
    ).toBe(false);
    expect(
      computeButtonState(
        "wmm.ui.toggleFullscreen",
        undefined,
        snapshot({ nowPlayingPage: false, fullscreen: true })
      ).disabled
    ).toBe(false);
  });

  it("disables sync start while a sync is running", () => {
    expect(
      computeButtonState("wmm.sync.start", undefined, snapshot()).disabled
    ).toBe(false);
    expect(
      computeButtonState(
        "wmm.sync.start",
        undefined,
        snapshot({ syncing: true })
      ).disabled
    ).toBe(true);
  });

  it("selects openNowPlaying while the page is visible", () => {
    expect(
      computeButtonState(
        "wmm.ui.openNowPlaying",
        undefined,
        snapshot({ nowPlayingOpen: true })
      ).selected
    ).toBe(true);
  });

  it("leaves a command without host state undecorated", () => {
    expect(
      computeButtonState("wmm.playback.next", undefined, snapshot())
    ).toEqual({ active: false, selected: false, disabled: false });
  });
});

describe("isToggleCommand", () => {
  it("is true for the host toggles", () => {
    expect(isToggleCommand("wmm.playback.toggleShuffle")).toBe(true);
    expect(isToggleCommand("wmm.ui.togglePanel")).toBe(true);
  });

  it("is false for a plain command", () => {
    expect(isToggleCommand("wmm.ui.navigate")).toBe(false);
    expect(isToggleCommand("wmm.playback.next")).toBe(false);
  });
});
