import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getThemeNavigationHandler,
  setThemeNavigationHandler,
  type ThemeNavigationHandler,
} from "./themeNavigation";

function createHandler(page: string): ThemeNavigationHandler {
  return {
    handlesPage: (candidate) => candidate === page,
    navigate: vi.fn(),
  };
}

afterEach(() => {
  setThemeNavigationHandler(undefined);
});

describe("theme navigation handler", () => {
  it("has no handler before one is set", () => {
    expect(getThemeNavigationHandler()).toBeUndefined();
  });

  it("returns the handler that was set", () => {
    const handler = createHandler("songs");
    setThemeNavigationHandler(handler);
    expect(getThemeNavigationHandler()).toBe(handler);
  });

  it("clears the handler when the disposer runs", () => {
    const dispose = setThemeNavigationHandler(createHandler("songs"));
    dispose();
    expect(getThemeNavigationHandler()).toBeUndefined();
  });

  it("keeps a newer handler when an older disposer runs", () => {
    const first = createHandler("songs");
    const second = createHandler("albums");
    const disposeFirst = setThemeNavigationHandler(first);
    setThemeNavigationHandler(second);

    disposeFirst();

    expect(getThemeNavigationHandler()).toBe(second);
  });

  it("clears the handler when set to undefined", () => {
    setThemeNavigationHandler(createHandler("songs"));
    setThemeNavigationHandler(undefined);
    expect(getThemeNavigationHandler()).toBeUndefined();
  });
});
