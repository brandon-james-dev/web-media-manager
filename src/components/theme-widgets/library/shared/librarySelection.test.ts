import { describe, expect, it, vi } from "vitest";
import {
  EMPTY_LIBRARY_PAGE_STATE,
  LibrarySelectionStore,
} from "./librarySelection";

describe("LibrarySelectionStore", () => {
  it("starts every page on the shared empty state", () => {
    const store = new LibrarySelectionStore();
    expect(store.getPage("library")).toBe(EMPTY_LIBRARY_PAGE_STATE);
    expect(store.getPage("library")).toBe(store.getPage("playlists"));
  });

  it("keeps the state of each page apart", () => {
    const store = new LibrarySelectionStore();
    store.setQuery("library", "blue");
    store.setQuery("playlists", "green");
    expect(store.getPage("library").query).toBe("blue");
    expect(store.getPage("playlists").query).toBe("green");
  });

  it("stores every field through its setter", () => {
    const store = new LibrarySelectionStore();
    store.setQuery("library", "blue");
    store.setSyncQuery("library", "coldplay");
    store.setSourceIds("library", ["ipod"]);
    store.select("library", { kind: "album", value: "X&Y" });
    store.setSelectedSongIds("library", ["1", "2"]);

    expect(store.getPage("library")).toEqual({
      query: "blue",
      syncQuery: "coldplay",
      sourceIds: ["ipod"],
      selection: { kind: "album", value: "X&Y" },
      selectedSongIds: ["1", "2"],
    });
  });

  it("keeps the snapshot stable when a setter changes nothing", () => {
    const store = new LibrarySelectionStore();
    store.setQuery("library", "blue");
    const before = store.getPage("library");

    store.setQuery("library", "blue");
    store.setSourceIds("library", []);
    store.select("library", { kind: "all" });
    store.setSelectedSongIds("library", []);

    expect(store.getPage("library")).toBe(before);
  });

  it("replaces the snapshot when a value changes", () => {
    const store = new LibrarySelectionStore();
    store.setQuery("library", "blue");
    const before = store.getPage("library");

    store.setQuery("library", "green");

    expect(store.getPage("library")).not.toBe(before);
    expect(store.getPage("library").query).toBe("green");
  });

  it("notifies subscribers on a change and stops after unsubscribe", () => {
    const store = new LibrarySelectionStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setQuery("library", "blue");
    expect(listener).toHaveBeenCalledTimes(1);

    store.setQuery("library", "blue");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.setQuery("library", "green");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("tells two selections apart by kind and value", () => {
    const store = new LibrarySelectionStore();
    store.select("library", { kind: "playlist", id: "p1" });
    const before = store.getPage("library");

    store.select("library", { kind: "playlist", id: "p1" });
    expect(store.getPage("library")).toBe(before);

    store.select("library", { kind: "playlist", id: "p2" });
    expect(store.getPage("library").selection).toEqual({
      kind: "playlist",
      id: "p2",
    });

    store.select("library", { kind: "artist", value: "p2" });
    expect(store.getPage("library").selection).toEqual({
      kind: "artist",
      value: "p2",
    });
  });

  it("tells two view selections apart by view", () => {
    const store = new LibrarySelectionStore();
    store.select("library", { kind: "view", view: "artists" });
    const before = store.getPage("library");

    store.select("library", { kind: "view", view: "artists" });
    expect(store.getPage("library")).toBe(before);

    store.select("library", { kind: "view", view: "albums" });
    expect(store.getPage("library").selection).toEqual({
      kind: "view",
      view: "albums",
    });

    store.select("library", { kind: "all" });
    expect(store.getPage("library").selection).toEqual({ kind: "all" });
  });
});
