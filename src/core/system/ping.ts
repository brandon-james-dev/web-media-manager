import { WMM_VERSION, type SystemPing } from "./types";

/**
 * Domain: System.
 * Open Subsonic equivalent: ping().
 */
export async function ping(): Promise<SystemPing> {
  return { version: WMM_VERSION };
}
