import { describe, it, expect, afterEach } from "vitest";
import { wmmBus } from "./bus";

/**
 * The bus is a singleton; to keep tests independent we track and tear down
 * any subscribers each test creates.
 */
const subscriptions: Array<() => void> = [];
afterEach(() => {
  while (subscriptions.length) subscriptions.pop()!();
});

function sub(fn: () => void): () => void {
  subscriptions.push(fn);
  return fn;
}

describe("wmmBus.invoke", () => {
  it("dispatches a registered command to its handler", () => {
    const handler = (payload?: { songId: string }) => {
      calls.push(payload);
    };
    const calls: Array<{ songId: string } | undefined> = [];
    sub(wmmBus.onCommand("wmm.playback.playSong", handler));

    const ok = wmmBus.invoke("wmm.playback.playSong", { songId: "s1" });
    expect(ok).toBe(true);
    expect(calls).toEqual([{ songId: "s1" }]);
  });

  it("delivers undefined payload for no-payload commands", () => {
    const calls: Array<undefined> = [];
    sub(wmmBus.onCommand("wmm.playback.playpause", (p) => calls.push(p)));
    wmmBus.invoke("wmm.playback.playpause");
    expect(calls).toEqual([undefined]);
  });

  it("rejects unknown command names (returns false, no message)", () => {
    const called: string[] = [];
    sub(wmmBus.onCommand("wmm.playback.playpause", () => called.push("x")));
    const ok = wmmBus.invoke("wmm.bogus.command" as never);
    expect(ok).toBe(false);
    expect(called).toEqual([]);
  });

  it("does not deliver a command to event subscribers of the same name", () => {
    const called: string[] = [];
    sub(
      wmmBus.on(
        "wmm.playback.playpause".replace("playpause", "paused") as never,
        () => called.push("event")
      )
    );
    wmmBus.invoke("wmm.playback.playpause");
    expect(called).toEqual([]);
  });
});

describe("wmmBus.publish", () => {
  it("delivers a typed event payload to handlers", () => {
    const calls: Array<{ songId: string } | undefined> = [];
    sub(wmmBus.on("wmm.library.song.updated", (p) => calls.push(p)));
    const ok = wmmBus.publish("wmm.library.song.updated", { songId: "s9" });
    expect(ok).toBe(true);
    expect(calls).toEqual([{ songId: "s9" }]);
  });

  it("rejects unknown event names", () => {
    const called: string[] = [];
    sub(wmmBus.on("wmm.library.song.updated", () => called.push("x")));
    const ok = wmmBus.publish("wmm.bogus.event" as never);
    expect(ok).toBe(false);
    expect(called).toEqual([]);
  });

  it("does not deliver an event to command subscribers", () => {
    const called: string[] = [];
    sub(
      wmmBus.onCommand("wmm.library.song.updated" as never, () =>
        called.push("cmd")
      )
    );
    wmmBus.publish("wmm.library.song.updated");
    expect(called).toEqual([]);
  });
});

describe("wmmBus subscriptions", () => {
  it("unsubscribes and stops receiving messages", () => {
    const calls: string[] = [];
    const off = wmmBus.on("wmm.playback.started", () => calls.push("hit"));
    wmmBus.publish("wmm.playback.started", { songId: "s1" });
    off();
    wmmBus.publish("wmm.playback.started", { songId: "s2" });
    expect(calls).toEqual(["hit"]);
  });

  it("tracks subscriber count (diagnostics)", () => {
    const before = wmmBus.subscriberCount;
    const off = wmmBus.on("wmm.playback.paused", () => {});
    expect(wmmBus.subscriberCount).toBe(before + 1);
    off();
    expect(wmmBus.subscriberCount).toBe(before);
  });

  it("on$ returns an observable of typed payloads", () => {
    const seen: Array<{ volume: number } | undefined> = [];
    const subObj = wmmBus
      .on$("wmm.playback.volumeChanged")
      .subscribe((p) => seen.push(p));
    wmmBus.publish("wmm.playback.volumeChanged", { volume: 0.5 });
    subObj.unsubscribe();
    expect(seen).toEqual([{ volume: 0.5 }]);
  });

  it("messages$ exposes the raw stream", () => {
    const kinds: string[] = [];
    const subObj = wmmBus.messages$.subscribe((m) => kinds.push(m.kind));
    wmmBus.invoke("wmm.playback.next");
    wmmBus.publish("wmm.playback.completed", { songId: "s1" });
    subObj.unsubscribe();
    expect(kinds).toEqual(["command", "event"]);
  });
});

describe("wmmBus.on$ / on", () => {
  it("does not leak subscriptions across names", () => {
    const a: string[] = [];
    const b: string[] = [];
    sub(wmmBus.on("wmm.sync.queued", (p) => a.push(p?.songIds?.[0] ?? "")));
    sub(wmmBus.on("wmm.sync.dequeued", (p) => b.push(p?.songIds?.[0] ?? "")));
    wmmBus.publish("wmm.sync.queued", { songIds: ["q1"] });
    expect(a).toEqual(["q1"]);
    expect(b).toEqual([]);
  });
});
