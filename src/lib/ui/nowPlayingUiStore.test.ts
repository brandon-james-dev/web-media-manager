import { describe, expect, it, vi } from "vitest";
import {
  NowPlayingUiStateStore,
  getNowPlayingUiStore,
  type NowPlayingUiEventSource,
} from "./nowPlayingUiStore";

function createFakeBus() {
  const handlers = new Map<string, Set<(payload?: unknown) => void>>();

  const source: NowPlayingUiEventSource = {
    on: (event, handler) => {
      const listeners = handlers.get(event) ?? new Set();
      const listener = handler as (payload?: unknown) => void;
      listeners.add(listener);
      handlers.set(event, listeners);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return {
    source,
    emit(event: string, payload?: unknown) {
      for (const handler of handlers.get(event) ?? []) handler(payload);
    },
  };
}

describe("NowPlayingUiStateStore", () => {
  it("starts closed, windowed and lit", () => {
    const store = new NowPlayingUiStateStore(createFakeBus().source);
    expect(store.getSnapshot()).toEqual({
      nowPlayingOpen: false,
      fullscreen: false,
      darkRoom: false,
    });
  });

  it("follows the now-playing open state", () => {
    const bus = createFakeBus();
    const store = new NowPlayingUiStateStore(bus.source);

    bus.emit("wmm.ui.nowPlayingChanged", { open: true });
    expect(store.getSnapshot().nowPlayingOpen).toBe(true);

    bus.emit("wmm.ui.nowPlayingChanged", { open: false });
    expect(store.getSnapshot().nowPlayingOpen).toBe(false);
  });

  it("follows fullscreen and dark room", () => {
    const bus = createFakeBus();
    const store = new NowPlayingUiStateStore(bus.source);

    bus.emit("wmm.ui.fullscreenChanged", { fullscreen: true });
    bus.emit("wmm.ui.darkRoomChanged", { enabled: true });

    expect(store.getSnapshot().fullscreen).toBe(true);
    expect(store.getSnapshot().darkRoom).toBe(true);
  });

  it("notifies subscribers and stops after unsubscribe", () => {
    const bus = createFakeBus();
    const store = new NowPlayingUiStateStore(bus.source);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    bus.emit("wmm.ui.nowPlayingChanged", { open: true });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    bus.emit("wmm.ui.nowPlayingChanged", { open: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps the same snapshot when a value does not change", () => {
    const bus = createFakeBus();
    const store = new NowPlayingUiStateStore(bus.source);
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();

    bus.emit("wmm.ui.fullscreenChanged", { fullscreen: false });

    expect(store.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("creates the app-wide store once", () => {
    expect(getNowPlayingUiStore()).toBe(getNowPlayingUiStore());
  });
});
