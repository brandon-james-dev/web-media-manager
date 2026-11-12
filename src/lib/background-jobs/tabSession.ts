import { uuidv7 } from "uuidv7";

/**
 * Identity of this browser tab/window. A tab holds a Web Lock named after its
 * id for as long as it is open, so another tab can tell whether a saved job's
 * owner is still alive or has been closed (the lock is released on close,
 * refresh and crash).
 */
export const tabId = uuidv7();

const lockName = (id: string) => `wmm-tab-${id}`;

function locks(): LockManager | undefined {
  return typeof navigator !== "undefined" ? navigator.locks : undefined;
}

export function holdTabLock(): void {
  void locks()?.request(
    lockName(tabId),
    () => new Promise<void>(() => undefined)
  );
}

export async function isTabAlive(id: string): Promise<boolean> {
  if (id === tabId) return true;
  const manager = locks();
  if (!manager) return false;
  const { held } = await manager.query();
  return held?.some((lock) => lock.name === lockName(id)) ?? false;
}
