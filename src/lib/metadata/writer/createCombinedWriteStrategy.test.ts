import { describe, expect, it, vi } from "vitest";

import { createCombinedWriteStrategy } from "@/lib/metadata/writer/createCombinedWriteStrategy";
import type { IMetadataWriteStrategy } from "@/lib/contracts";
import type { Song } from "@/models";

function makeSong(partial: Partial<Song> = {}): Song {
  return { id: "s1", title: "T", artist: "A", ...partial } as Song;
}

function strategyThat(returnsSong: Song | null): IMetadataWriteStrategy {
  return {
    async write(id: string) {
      return returnsSong && { ...returnsSong, id };
    },
  };
}

describe("createCombinedWriteStrategy", () => {
  it("applies each strategy sequentially in order", async () => {
    const order: string[] = [];
    const s1: IMetadataWriteStrategy = {
      async write(id, updates) {
        order.push("s1");
        void id;
        void updates;
        return makeSong({ title: "first" });
      },
    };
    const s2: IMetadataWriteStrategy = {
      async write(id, updates) {
        order.push("s2");
        void id;
        void updates;
        return makeSong({ title: "second" });
      },
    };

    await createCombinedWriteStrategy(s1, s2).write("s1", { title: "x" });

    expect(order).toEqual(["s1", "s2"]);
  });

  it("feeds the previous strategy's output into the next as updates", async () => {
    const seen: unknown[] = [];
    const s1: IMetadataWriteStrategy = {
      async write(_id, updates) {
        seen.push(updates);
        return makeSong({ title: "first" });
      },
    };
    const s2: IMetadataWriteStrategy = {
      async write(_id, updates) {
        seen.push(updates);
        return makeSong({ title: "second" });
      },
    };

    await createCombinedWriteStrategy(s1, s2).write("s1", { title: "x" });

    // s2 receives s1's output (the current song), not the original updates
    expect(seen[0]).toEqual({ title: "x" });
    expect(seen[1]).toMatchObject({ title: "first" });
  });

  it("short-circuits and returns null if any strategy returns null", async () => {
    const later = vi.fn();
    const failing: IMetadataWriteStrategy = {
      async write() {
        return null;
      },
    };
    const s3: IMetadataWriteStrategy = {
      async write() {
        later();
        return makeSong();
      },
    };

    const result = await createCombinedWriteStrategy(failing, s3).write(
      "s1",
      {}
    );
    expect(result).toBeNull();
    expect(later).not.toHaveBeenCalled();
  });

  it("propagates the final strategy's result as the combined output", async () => {
    const result = await createCombinedWriteStrategy(
      strategyThat(makeSong({ title: "a" })),
      strategyThat(makeSong({ title: "final" }))
    ).write("s1", {});

    expect(result).toMatchObject({ title: "final" });
    // strategies normalize the id to the write id
    expect(result?.id).toBe("s1");
  });

  it("handles an empty strategy list (no-op, undefined result)", async () => {
    const result = await createCombinedWriteStrategy().write("s1", {});
    // loop never runs, current stays null
    expect(result).toBeNull();
  });

  it("passes the original write id to each strategy", async () => {
    const ids: string[] = [];
    const s1: IMetadataWriteStrategy = {
      async write(id) {
        ids.push(id);
        return makeSong();
      },
    };
    const s2: IMetadataWriteStrategy = {
      async write(id) {
        ids.push(id);
        return makeSong();
      },
    };

    await createCombinedWriteStrategy(s1, s2).write("the-id", {});
    expect(ids).toEqual(["the-id", "the-id"]);
  });
});
