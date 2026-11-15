import { useSyncExternalStore } from "react";
import { getSourcesStore } from "@/core/ports";
import type { MusicSourceKind } from "@/core/contracts/sources";

/**
 * One shared snapshot of source id → kind.
 *
 * The song table renders a cell per row and each needs to know whether its
 * source is inherently offline, so the mapping is loaded once and shared
 * rather than queried per row.
 */
let snapshot: ReadonlyMap<string, MusicSourceKind> = new Map();
const subscribers = new Set<() => void>();
let started = false;

function emit(): void {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

async function reload(): Promise<void> {
  try {
    const sources = await getSourcesStore().getSources();
    snapshot = new Map(sources.map((source) => [source.id, source.kind]));
  } catch {
    snapshot = new Map();
  }
  emit();
}

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange);

  if (!started) {
    started = true;
    void reload();
  }

  return () => {
    subscribers.delete(onChange);
  };
}

function getSnapshot(): ReadonlyMap<string, MusicSourceKind> {
  return snapshot;
}

/** Every source's kind, keyed by source id, kept current as sources change. */
export function useSourceKinds(): ReadonlyMap<string, MusicSourceKind> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Test seam: drop the cached snapshot. */
export function resetSourceKinds(): void {
  snapshot = new Map();
  started = false;
  emit();
}
