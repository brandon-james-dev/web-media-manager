import type { DeviceDetector } from "./DeviceDetector";
import { IpodDetector } from "./IpodDetector";
import { MtpDetector } from "./MtpDetector";

/**
 * The detectors, in the order they are tried.
 *
 * The Zune detector is loaded on demand so a failure inside `zunesync-ts`
 * cannot take down the app's startup graph: an eager import would put the
 * whole Zune stack in the initial bundle, and any throw there stops the app
 * from mounting. It is pulled in only when a scan actually runs.
 */
export async function getDetectors(): Promise<DeviceDetector[]> {
  const detectors: DeviceDetector[] = [new IpodDetector()];

  try {
    const { ZuneDetector } = await import("./ZuneDetector");
    // Before MtpDetector: a Zune is an MTP device, and the generic detector
    // would claim it as a plain mass-storage folder.
    detectors.push(new ZuneDetector());
  } catch (error) {
    // A Zune then cannot be detected, but that must not stop an iPod or a
    // mass-storage player from being scanned.
    console.warn("[sync] Zune support unavailable:", error);
  }

  detectors.push(new MtpDetector());
  return detectors;
}
