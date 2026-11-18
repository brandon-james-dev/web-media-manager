import { describe, expect, it } from "vitest";
import type { ThemeLayoutStorage } from "./themeLayoutState";
import { ThemeLayoutState } from "./themeLayoutState";

const PAGES = [
  { id: "library", overlay: false },
  { id: "playlists", overlay: false },
  { id: "now-playing", overlay: true },
];

function fakeStorage(initial: Record<string, string> = {}): {
  storage: ThemeLayoutStorage;
  values: Record<string, string>;
} {
  const values = { ...initial };
  return {
    values,
    storage: {
      getItem: (key) => values[key] ?? null,
      setItem: (key, value) => {
        values[key] = value;
      },
    },
  };
}

function createState(
  storage?: ThemeLayoutStorage,
  defaultPageId = "library"
): ThemeLayoutState {
  return new ThemeLayoutState({
    themeId: "classic-blue",
    formFactor: "desktop",
    pages: PAGES,
    defaultPageId,
    ...(storage === undefined ? {} : { storage }),
  });
}

describe("ThemeLayoutState", () => {
  it("starts on the default page with every panel closed", () => {
    const state = createState(fakeStorage().storage);
    const snapshot = state.getSnapshot();
    expect(snapshot.currentPage).toBe("library");
    expect(snapshot.previousPage).toBeUndefined();
    expect(snapshot.overlayOpen).toBe(false);
    expect(snapshot.fullscreen).toBe(false);
    expect(snapshot.openPanels.size).toBe(0);
    expect(snapshot.selectedTabs).toEqual({});
  });

  it("navigates to a known page and remembers the previous one", () => {
    const { storage, values } = fakeStorage();
    const state = createState(storage);
    expect(state.navigate("playlists")).toBe(true);
    expect(state.getSnapshot().currentPage).toBe("playlists");
    expect(state.getSnapshot().previousPage).toBe("library");
    expect(values["wmm.theme.page.classic-blue.desktop"]).toBe("playlists");
  });

  it("rejects an unknown page", () => {
    const state = createState(fakeStorage().storage);
    expect(state.navigate("missing")).toBe(false);
    expect(state.getSnapshot().currentPage).toBe("library");
  });

  it("opens an overlay page over the current one", () => {
    const state = createState(fakeStorage().storage);
    expect(state.navigate("now-playing")).toBe(true);
    expect(state.getSnapshot().overlayOpen).toBe(true);
    expect(state.getSnapshot().currentPage).toBe("library");
  });

  it("closes the overlay when navigating elsewhere", () => {
    const state = createState(fakeStorage().storage);
    state.navigate("now-playing");
    state.navigate("playlists");
    expect(state.getSnapshot().overlayOpen).toBe(false);
    expect(state.getSnapshot().currentPage).toBe("playlists");
  });

  it("restores the stored page", () => {
    const { storage } = fakeStorage({
      "wmm.theme.page.classic-blue.desktop": "playlists",
    });
    expect(createState(storage).getSnapshot().currentPage).toBe("playlists");
  });

  it("ignores a stored page that no longer exists or is an overlay", () => {
    const missing = fakeStorage({
      "wmm.theme.page.classic-blue.desktop": "gone",
    });
    expect(createState(missing.storage).getSnapshot().currentPage).toBe(
      "library"
    );

    const overlay = fakeStorage({
      "wmm.theme.page.classic-blue.desktop": "now-playing",
    });
    expect(createState(overlay.storage).getSnapshot().currentPage).toBe(
      "library"
    );
  });

  it("toggles a panel open and closed", () => {
    const state = createState(fakeStorage().storage);
    state.togglePanel("sidebar");
    expect(state.getSnapshot().openPanels.has("sidebar")).toBe(true);
    state.togglePanel("sidebar");
    expect(state.getSnapshot().openPanels.has("sidebar")).toBe(false);
  });

  it("remembers the selected tab per tabs element", () => {
    const state = createState(fakeStorage().storage);
    state.selectTab("playback-tabs", "lyrics");
    expect(state.getSnapshot().selectedTabs["playback-tabs"]).toBe("lyrics");
    state.selectTab("library-tabs", "albums");
    expect(state.getSnapshot().selectedTabs).toEqual({
      "playback-tabs": "lyrics",
      "library-tabs": "albums",
    });
  });

  it("keeps the snapshot stable until something changes", () => {
    const state = createState(fakeStorage().storage);
    const first = state.getSnapshot();
    expect(state.getSnapshot()).toBe(first);
    state.navigate("library");
    expect(state.getSnapshot()).toBe(first);
    state.navigate("playlists");
    expect(state.getSnapshot()).not.toBe(first);
  });

  it("notifies subscribers only on change", () => {
    const state = createState(fakeStorage().storage);
    let calls = 0;
    const unsubscribe = state.subscribe(() => {
      calls += 1;
    });
    state.navigate("library");
    expect(calls).toBe(0);
    state.navigate("playlists");
    expect(calls).toBe(1);
    state.selectTab("playback-tabs", "lyrics");
    expect(calls).toBe(2);
    state.selectTab("playback-tabs", "lyrics");
    expect(calls).toBe(2);
    unsubscribe();
    state.togglePanel("sidebar");
    expect(calls).toBe(2);
  });

  it("records full screen and notifies only on change", () => {
    const state = createState(fakeStorage().storage);
    let calls = 0;
    const unsubscribe = state.subscribe(() => {
      calls += 1;
    });
    expect(state.getSnapshot().fullscreen).toBe(false);
    state.setFullscreen(false);
    expect(calls).toBe(0);
    state.setFullscreen(true);
    expect(state.getSnapshot().fullscreen).toBe(true);
    expect(calls).toBe(1);
    state.setFullscreen(true);
    expect(calls).toBe(1);
    state.setFullscreen(false);
    expect(state.getSnapshot().fullscreen).toBe(false);
    expect(calls).toBe(2);
    unsubscribe();
  });

  it("toggles edit mode without remembering it", () => {
    const { storage, values } = fakeStorage();
    const state = createState(storage);
    expect(state.getSnapshot().editMode).toBe(false);
    expect(state.toggleEditMode()).toBe(true);
    expect(state.getSnapshot().editMode).toBe(true);
    expect(values["wmm.theme.page.classic-blue.desktop"]).toBeUndefined();
    state.toggleEditMode();
    expect(state.getSnapshot().editMode).toBe(false);
  });

  it("falls back to the first page without a default", () => {
    const state = new ThemeLayoutState({
      themeId: "classic-blue",
      formFactor: "desktop",
      pages: PAGES,
      storage: fakeStorage().storage,
    });
    expect(state.getSnapshot().currentPage).toBe("library");
  });
});
