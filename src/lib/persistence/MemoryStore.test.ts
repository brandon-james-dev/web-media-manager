import { describe, expect, it, vi } from "vitest";

import { MemoryStore } from "@/lib/persistence/MemoryStore";

interface Item {
  id: string;
  name: string;
  group: string;
  order: number;
}

function makeItem(id: string, order: number, name?: string): Item {
  return {
    id,
    name: name ?? `item-${id}`,
    group: order % 2 === 0 ? "even" : "odd",
    order,
  };
}

describe("MemoryStore (IRepository contract)", () => {
  it("creates then reads a saved item", async () => {
    const store = new MemoryStore<Item>();

    await store.save("a", makeItem("a", 1));

    await expect(store.get("a")).resolves.toEqual(makeItem("a", 1));
    await expect(store.get("missing")).resolves.toBeNull();
  });

  it("emits onAdded for a new item and onUpdated for an existing one", async () => {
    const store = new MemoryStore<Item>();
    const onAdded = vi.fn();
    const onUpdated = vi.fn();
    store.onAdded(onAdded);
    store.onUpdated(onUpdated);

    await store.save("a", makeItem("a", 1));
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(onAdded).toHaveBeenCalledWith(makeItem("a", 1));
    expect(onUpdated).not.toHaveBeenCalled();

    const modified = { ...makeItem("a", 1), name: "renamed" };
    await store.save("a", modified);
    expect(onAdded).toHaveBeenCalledTimes(1);
    expect(onUpdated).toHaveBeenCalledWith(modified);
  });

  it("deletes and emits onDeleted only when the item exists", async () => {
    const store = new MemoryStore<Item>();
    const onDeleted = vi.fn();
    store.onDeleted(onDeleted);

    await store.delete("missing"); // no-op
    expect(onDeleted).not.toHaveBeenCalled();

    await store.save("a", makeItem("a", 1));
    await store.delete("a");
    expect(onDeleted).toHaveBeenCalledWith(makeItem("a", 1));
    await expect(store.get("a")).resolves.toBeNull();
  });

  it("returns all items", async () => {
    const store = new MemoryStore<Item>();
    await store.save("a", makeItem("a", 1));
    await store.save("b", makeItem("b", 2));
    await store.save("c", makeItem("c", 3));

    await expect(store.getAll()).resolves.toHaveLength(3);
  });

  it("filters and reports filteredCount", async () => {
    const store = new MemoryStore<Item>();
    await store.save("a", makeItem("a", 1));
    await store.save("b", makeItem("b", 2));

    const res = await store.filter({
      filter: (item) => item.group === "even",
    });

    expect(res.data.map((i) => i.id)).toEqual(["b"]);
    expect(res.total).toBe(2);
    expect(res.filteredCount).toBe(1);
  });

  it("sorts ascending and descending via selector", async () => {
    const store = new MemoryStore<Item>();
    await store.save("a", makeItem("a", 2));
    await store.save("b", makeItem("b", 1));
    await store.save("c", makeItem("c", 3));

    const asc = await store.filter({
      sort: { selector: (i) => i.order as any, desc: false },
    });
    expect(asc.data.map((i) => i.id)).toEqual(["b", "a", "c"]);

    const desc = await store.filter({
      sort: { selector: (i) => i.order as any, desc: true },
    });
    expect(desc.data.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("paginates with skip/take", async () => {
    const store = new MemoryStore<Item>();
    for (let n = 1; n <= 5; n++) await store.save(`id${n}`, makeItem(`id${n}`, n));

    const page1 = await store.filter({ skip: 0, take: 2 });
    expect(page1.data.map((i) => i.id)).toEqual(["id1", "id2"]);
    expect(page1.page).toBe(0);
    expect(page1.total).toBe(5);
    expect(page1.skip).toBe(0);

    const page2 = await store.filter({ skip: 2, take: 2 });
    expect(page2.data.map((i) => i.id)).toEqual(["id3", "id4"]);
    expect(page2.page).toBe(1);

    const page3 = await store.filter({ skip: 4, take: 2 });
    expect(page3.data.map((i) => i.id)).toEqual(["id5"]); // partial last page
  });

  it("supports string selector keys in sort", async () => {
    const store = new MemoryStore<Item>();
    await store.save("a", makeItem("a", 2, "zeta"));
    await store.save("b", makeItem("b", 1, "alpha"));

    const res = await store.filter({ sort: { selector: "name" as never, desc: false } });
    expect(res.data.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("batchUpdate and batchDelete without events", async () => {
    const store = new MemoryStore<Item>();
    const onAdded = vi.fn();
    const onDeleted = vi.fn();
    store.onAdded(onAdded);
    store.onDeleted(onDeleted);

    for (let n = 1; n <= 3; n++) await store.save(`id${n}`, makeItem(`id${n}`, n));
    onAdded.mockClear();

    await store.batchUpdate([
      { id: "id1", updated: { ...makeItem("id1", 1), name: "batch" } },
      { id: "id2", updated: { ...makeItem("id2", 2), name: "batch" } },
    ]);
    expect(onAdded).not.toHaveBeenCalled();
    await expect(store.get("id1")).resolves.toMatchObject({ name: "batch" });

    await store.batchDelete(["id1", "id2"]);
    expect(onDeleted).not.toHaveBeenCalled();
    await expect(store.get("id1")).resolves.toBeNull();
    await expect(store.get("id3")).resolves.toBeTruthy();
  });
});
