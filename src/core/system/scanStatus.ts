import type { SystemScanStatus } from "./types";

/**
 * Domain: System.
 * Open Subsonic equivalent: getScanStatus().
 *
 * Today this app has no persistent scan journal, so scanning is always
 * reported as inactive. Wired to the real job state in a later phase.
 */
export async function getScanStatus(): Promise<SystemScanStatus> {
  return { scanning: false, count: null, lastScan: null };
}
