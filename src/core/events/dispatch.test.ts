import { describe, it, expect, afterEach } from "vitest";
import { commandDispatcher, connectCommandDispatch } from "./dispatch";
import { wmmBus } from "./bus";

const subscriptions: Array<() => void> = [];
afterEach(() => {
  while (subscriptions.length) subscriptions.pop()!();
});
const sub = (fn: () => void) => {
  subscriptions.push(fn);
  return fn;
};

describe("commandDispatcher", () => {
  it("invokes a registered handler with its payload", () => {
    const calls: Array<{ songIds: string[] } | undefined> = [];
    sub(
      commandDispatcher.register("wmm.library.song.quickEdit", (p) => {
        calls.push(p);
      })
    );

    const ok = commandDispatcher.invoke("wmm.library.song.quickEdit", {
      songIds: ["a", "b"],
    });
    expect(ok).toBe(true);
    expect(calls).toEqual([{ songIds: ["a", "b"] }]);
  });

  it("returns false for unregistered names", () => {
    const ok = commandDispatcher.invoke("wmm.playback.seek", {
      positionSeconds: 5,
    });
    expect(ok).toBe(false);
  });

  it("unregisters a handler and stops invoking it", () => {
    let count = 0;
    const off = commandDispatcher.register("wmm.playback.next", () => {
      count++;
    });
    commandDispatcher.invoke("wmm.playback.next");
    off();
    commandDispatcher.invoke("wmm.playback.next");
    expect(count).toBe(1);
  });

  it("reports registered names", () => {
    sub(commandDispatcher.register("wmm.playback.stop", () => {}));
    expect(commandDispatcher.has("wmm.playback.stop")).toBe(true);
    expect(commandDispatcher.registeredNames).toContain("wmm.playback.stop");
  });

  it("supports async handlers (fire-and-forget)", async () => {
    let done = false;
    sub(
      commandDispatcher.register("wmm.playback.toggleShuffle", async () => {
        await Promise.resolve();
        done = true;
      })
    );
    const ok = commandDispatcher.invoke("wmm.playback.toggleShuffle");
    expect(ok).toBe(true);
    await viWait();
    expect(done).toBe(true);
  });
});

describe("connectCommandDispatch", () => {
  it("routes bus commands to the dispatcher registry", () => {
    const calls: Array<{ songId: string } | undefined> = [];
    sub(
      commandDispatcher.register("wmm.playback.playSong", (p) => {
        calls.push(p);
      })
    );
    const off = connectCommandDispatch();
    sub(() => {
      off();
    });

    wmmBus.invoke("wmm.playback.playSong", { songId: "s1" });
    expect(calls).toEqual([{ songId: "s1" }]);
  });

  it("ignores events on the bus", () => {
    let called = false;
    sub(
      commandDispatcher.register("wmm.playback.paused" as never, () => {
        called = true;
      })
    );
    const off = connectCommandDispatch();
    sub(() => off());

    wmmBus.publish("wmm.playback.paused", { songId: "s1" });
    expect(called).toBe(false);
  });
});

function viWait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
