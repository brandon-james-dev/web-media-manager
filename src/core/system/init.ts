import { getStore } from "@/core/ports";

/**
 * Access the current backing store through the portable store port.
 * The concrete implementation (browser: Dexie + FileSystem) is supplied
 * by the platform binding registered during bootstrap.
 */
export function ensureInitialized(): void {
  getStore();
}

/** Re-export the portable store port accessor. */
export { getStore };
