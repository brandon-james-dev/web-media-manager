import { clearDb } from "@/lib/clearDb";

/**
 * Wipe the library. Open Subsonic equivalent: n/a (destructive reset).
 */
export async function clearLibrary(): Promise<void> {
  await clearDb();
}
